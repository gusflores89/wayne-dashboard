"""
MLS NEXT CLUB CONTACT SCRAPER v2
================================
Versión mejorada que busca en Google el website correcto de cada club.

USO:
    python mls_next_scraper_v2.py

AUTOR: Generado por Claude
FECHA: Enero 2026
"""

import time
import re
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from urllib.parse import urljoin, urlparse

# ============================================
# CONFIGURACIÓN
# ============================================

DELAY = 2
OUTPUT_FILE = "mls_next_contacts_v2.xlsx"
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
PHONE_PATTERN = re.compile(r'[\(]?[0-9]{3}[\)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}')

# Dominios a ignorar en búsqueda de Google
DOMINIOS_IGNORAR = [
    'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
    'youtube.com', 'tiktok.com', 'yelp.com', 'yellowpages.com',
    'mapquest.com', 'google.com', 'wikipedia.org', 'hugedomains.com',
    'godaddy.com', 'wix.com', 'soccerwire.com', 'topdrawersoccer.com'
]

# ============================================
# FUNCIONES
# ============================================

def crear_driver():
    """Crea y configura el driver de Chrome"""
    print("Iniciando Chrome...")
    options = webdriver.ChromeOptions()
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    # Evitar detección de bot
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    return driver


def buscar_en_google(driver, club_name):
    """Busca el website del club en Google"""
    
    try:
        # Ir a Google
        driver.get("https://www.google.com")
        time.sleep(1)
        
        # Buscar el campo de búsqueda
        try:
            # Aceptar cookies si aparece
            accept_btn = driver.find_elements(By.XPATH, "//button[contains(text(), 'Accept') or contains(text(), 'Acepto') or contains(text(), 'Aceptar')]")
            if accept_btn:
                accept_btn[0].click()
                time.sleep(0.5)
        except:
            pass
        
        # Encontrar el campo de búsqueda
        search_box = driver.find_element(By.NAME, "q")
        
        # Buscar el club
        query = f"{club_name} soccer club official website"
        search_box.clear()
        search_box.send_keys(query)
        search_box.send_keys(Keys.RETURN)
        
        time.sleep(2)
        
        # Obtener resultados
        resultados = driver.find_elements(By.CSS_SELECTOR, "div.g a")
        
        for resultado in resultados[:10]:
            try:
                href = resultado.get_attribute("href")
                if not href:
                    continue
                
                # Verificar que no sea un dominio a ignorar
                dominio = urlparse(href).netloc.lower()
                
                if any(ignorar in dominio for ignorar in DOMINIOS_IGNORAR):
                    continue
                
                # Verificar que sea un sitio real
                if href.startswith("http"):
                    return href
                    
            except:
                continue
        
    except Exception as e:
        print(f"    Error buscando en Google: {e}")
    
    return None


def buscar_paginas_contacto(driver, base_url):
    """Busca múltiples páginas de contacto/staff dentro del sitio"""
    
    paginas = []
    keywords = ['staff', 'contact', 'about', 'team', 'coaches', 'leadership', 'directory', 'admin', 'club-info']
    
    try:
        links = driver.find_elements(By.TAG_NAME, 'a')
        
        for link in links:
            try:
                href = link.get_attribute('href') or ''
                text = link.text.lower()
                
                # Verificar que sea del mismo dominio
                if base_url and urlparse(href).netloc != urlparse(base_url).netloc:
                    continue
                
                for keyword in keywords:
                    if keyword in href.lower() or keyword in text:
                        if href not in paginas:
                            paginas.append(href)
                        break
            except:
                continue
    except:
        pass
    
    return paginas[:5]  # Máximo 5 páginas


def extraer_emails(driver):
    """Extrae todos los emails de la página actual"""
    emails = set()
    
    try:
        html = driver.page_source
        encontrados = EMAIL_PATTERN.findall(html.lower())
        
        for email in encontrados:
            # Filtrar emails inválidos
            invalidos = ['.png', '.jpg', '.gif', '.svg', 'example.com', 'domain.com', 
                        'email.com', 'wixpress', 'sentry', 'cloudflare', 'googleapis']
            if not any(x in email for x in invalidos):
                emails.add(email)
    except:
        pass
    
    return list(emails)


def extraer_telefonos(driver):
    """Extrae teléfonos de la página actual"""
    phones = set()
    
    try:
        html = driver.page_source
        encontrados = PHONE_PATTERN.findall(html)
        
        for phone in encontrados:
            clean = re.sub(r'[^\d]', '', phone)
            if len(clean) >= 10:
                phones.add(phone)
    except:
        pass
    
    return list(phones)


def clasificar_emails(emails):
    """Clasifica emails por tipo"""
    director_email = None
    club_email = None
    
    # Prioridad para emails de director
    director_keywords = ['director', 'doc', 'president', 'executive', 'coach', 'technical', 'admin']
    club_keywords = ['info', 'contact', 'office', 'hello', 'general', 'registration', 'register']
    
    for email in emails:
        email_lower = email.lower()
        
        if not director_email:
            for kw in director_keywords:
                if kw in email_lower:
                    director_email = email
                    break
        
        if not club_email:
            for kw in club_keywords:
                if kw in email_lower:
                    club_email = email
                    break
    
    # Si no encontramos específicos, usar el primero
    if not director_email and not club_email and emails:
        club_email = emails[0]
    
    return director_email, club_email


def scrape_club(driver, club_name):
    """Hace el scraping completo de un club"""
    
    resultado = {
        'Club': club_name,
        'Website': '',
        'Paginas Revisadas': '',
        'Email Director': '',
        'Email Club': '',
        'Telefono': '',
        'Todos los Emails': '',
        'Estado': ''
    }
    
    try:
        # Paso 1: Buscar website en Google
        print(f"    Buscando en Google...")
        website = buscar_en_google(driver, club_name)
        
        if not website:
            resultado['Estado'] = 'Website no encontrado en Google'
            return resultado
        
        resultado['Website'] = website
        print(f"    Website: {website}")
        
        # Paso 2: Ir al website
        driver.get(website)
        time.sleep(2)
        
        # Verificar que el sitio cargó correctamente
        if 'not found' in driver.title.lower() or '404' in driver.title:
            resultado['Estado'] = 'Sitio no disponible'
            return resultado
        
        # Paso 3: Extraer emails de la página principal
        todos_emails = extraer_emails(driver)
        todos_telefonos = extraer_telefonos(driver)
        
        # Paso 4: Buscar y revisar páginas de contacto/staff
        paginas_contacto = buscar_paginas_contacto(driver, website)
        paginas_revisadas = [website]
        
        for pagina in paginas_contacto:
            try:
                driver.get(pagina)
                time.sleep(1.5)
                paginas_revisadas.append(pagina)
                
                nuevos_emails = extraer_emails(driver)
                nuevos_telefonos = extraer_telefonos(driver)
                
                todos_emails.extend(nuevos_emails)
                todos_telefonos.extend(nuevos_telefonos)
            except:
                continue
        
        # Eliminar duplicados
        todos_emails = list(set(todos_emails))
        todos_telefonos = list(set(todos_telefonos))
        
        # Paso 5: Clasificar emails
        director_email, club_email = clasificar_emails(todos_emails)
        
        # Guardar resultados
        resultado['Paginas Revisadas'] = len(paginas_revisadas)
        resultado['Email Director'] = director_email or ''
        resultado['Email Club'] = club_email or ''
        resultado['Telefono'] = todos_telefonos[0] if todos_telefonos else ''
        resultado['Todos los Emails'] = '; '.join(todos_emails[:5])
        resultado['Estado'] = 'OK' if todos_emails else 'Sin emails visibles'
        
    except Exception as e:
        resultado['Estado'] = f'Error: {str(e)[:50]}'
    
    return resultado


def obtener_lista_clubes():
    """Retorna la lista de clubes de MLS NEXT"""
    return [
        "956 United", "AC River", "AFC Lightning", "ALBION SC Boulder County",
        "ALBION SC Denver", "ALBION SC Las Vegas", "ALBION SC Los Angeles",
        "ALBION SC San Diego", "Alexandria SA", "Almaden FC", "Aspire FC",
        "Baltimore Armour", "Barca Residency Academy", "Bayside FC",
        "Beachside of Connecticut", "Beadling SC", "Bethesda SC",
        "Broomfield Soccer Club", "Capital City SC", "Carolina Core FC",
        "Cedar Stars Academy Bergen", "Cedar Stars Academy Monmouth",
        "Charleston SC", "Charlotte Independence SC", "Chicago FC United",
        "Chicago Fire Youth SC", "Cincinnati United Premier",
        "City SC San Diego", "Classic FC", "Club Ohio", "Colorado United SC",
        "Connecticut Rush", "Coppermine SC", "Dallas Hornets",
        "De Anza Force", "Downtown United Soccer Club", "Elmbrook United",
        "FC Bay Area Surf", "FC DELCO", "FC Golden State Force",
        "FC Greater Boston Bolts", "FC Richmond", "FC Tucson Youth",
        "FC Westchester", "Forward Madison FC", "Galaxy Soccer Club",
        "Hoover-Vestavia Soccer", "Houston Rangers", "IMG Academy",
        "Indy Eleven", "Inter Atlanta FC", "Jacksonville FC",
        "Keystone FC", "Kings Hammer Cincinnati", "LA Surf Soccer Club",
        "Lamorinda Soccer Club", "Las Vegas Sports Academy",
        "Long Island Soccer Club", "Los Angeles Soccer Club",
        "Lou Fusz Athletic", "Loudoun Soccer Club", "Louisiana Elite",
        "McLean Youth Soccer", "Michigan Jaguars", "Michigan Tigers FC",
        "Midwest United FC", "New Mexico Soccer Academy", "New York SC",
        "Oakwood Soccer Club", "One Knoxville SC", "Orlando City Youth SC",
        "PA Classics", "Phoenix Rising FC", "Real Futbol Academy",
        "Rhode Island Surf SC", "RSL Arizona", "Sacramento United",
        "San Francisco Glens SC", "SC Del Sol", "SC Wave", "Seacoast United",
        "Seattle Celtic", "Silicon Valley Soccer Academy", "SoCal Reds FC",
        "Sockers FC Chicago", "Sporting Athletic Club", "Sporting City",
        "Sporting Oklahoma", "Sporting San Diego", "Springfield SYC",
        "St. Louis Development Academy", "St. Louis Scott Gallagher",
        "Sting Nebraska", "Strikers FC", "Syracuse Development Academy",
        "Tampa Bay United", "The St. James", "Tonka Fusion Elite",
        "Tormenta FC Academy", "Triangle United", "TSF Academy",
        "Tulsa Greenwood SC", "Vardar Soccer Club", "Ventura County Fusion",
        "Virginia Revolution SC", "Wake FC", "Wasatch SC", "Washington Rush",
        "West Florida Flames", "Westside Metros FC", "Wisconsin United FC"
    ]


# ============================================
# PROGRAMA PRINCIPAL
# ============================================

def main():
    print("="*60)
    print("   MLS NEXT CLUB CONTACT SCRAPER v2")
    print("   (con búsqueda en Google)")
    print("="*60)
    
    driver = crear_driver()
    
    try:
        clubes = obtener_lista_clubes()
        
        # LÍMITE DE PRUEBA - cambiar para procesar más
        LIMITE = 10
        clubes = clubes[:LIMITE]
        
        print(f"\nProcesando {len(clubes)} clubes...")
        print("-"*60)
        
        resultados = []
        
        for i, club in enumerate(clubes, 1):
            print(f"\n[{i}/{len(clubes)}] {club}")
            
            resultado = scrape_club(driver, club)
            resultados.append(resultado)
            
            # Mostrar progreso
            if resultado['Email Director'] or resultado['Email Club']:
                email_encontrado = resultado['Email Director'] or resultado['Email Club']
                print(f"    ✓ Email: {email_encontrado}")
            else:
                print(f"    ✗ {resultado['Estado']}")
            
            time.sleep(DELAY)
            
            # Guardar progreso
            if i % 5 == 0:
                df = pd.DataFrame(resultados)
                df.to_excel("progreso_" + OUTPUT_FILE, index=False)
        
        # Guardar resultados finales
        df = pd.DataFrame(resultados)
        df.to_excel(OUTPUT_FILE, index=False, sheet_name='Contactos')
        
        # Estadísticas
        print("\n" + "="*60)
        print("   COMPLETADO!")
        print("="*60)
        print(f"Archivo guardado: {OUTPUT_FILE}")
        print(f"Total clubes: {len(resultados)}")
        print(f"Con website: {len([r for r in resultados if r['Website']])}")
        print(f"Con email: {len([r for r in resultados if r['Email Director'] or r['Email Club']])}")
        
    finally:
        print("\nCerrando Chrome...")
        driver.quit()


if __name__ == "__main__":
    main()
