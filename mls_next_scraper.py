"""
MLS NEXT CLUB CONTACT SCRAPER
=============================
Script para extraer contactos de clubes de MLS NEXT usando Selenium.

USO:
    python mls_next_scraper.py

AUTOR: Generado por Claude
FECHA: Enero 2026
"""

import time
import re
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from urllib.parse import urljoin

# ============================================
# CONFIGURACIÓN
# ============================================

# Tiempo de espera entre requests (segundos)
DELAY = 2

# Archivo de salida
OUTPUT_FILE = "mls_next_contacts.xlsx"

# Patrones para encontrar emails
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

# Patrones para encontrar teléfonos
PHONE_PATTERN = re.compile(r'[\(]?[0-9]{3}[\)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}')

# ============================================
# FUNCIONES
# ============================================

def crear_driver():
    """Crea y configura el driver de Chrome"""
    print("Iniciando Chrome...")
    options = webdriver.ChromeOptions()
    # Descomentar la siguiente línea para ejecutar sin ventana visible:
    # options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    return driver


def extraer_clubes_mls_next(driver):
    """Extrae la lista de clubes de la página de MLS NEXT"""
    print("\nObteniendo lista de clubes de MLS NEXT...")
    
    url = "https://www.mlssoccer.com/mlsnext/academy-division/members"
    driver.get(url)
    time.sleep(3)  # Esperar que cargue
    
    # Obtener todo el texto de la página
    html = driver.page_source
    
    # Lista de clubes conocidos de MLS NEXT (extraída previamente)
    clubes = [
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
    
    print(f"Total de clubes a procesar: {len(clubes)}")
    return clubes


def buscar_website(driver, club_name):
    """Intenta encontrar el website oficial de un club"""
    
    # Generar variaciones del nombre para URLs
    slug = club_name.lower()
    slug = re.sub(r'[^a-z0-9]', '', slug)
    
    urls_a_probar = [
        f"https://www.{slug}.com",
        f"https://www.{slug}soccer.com",
        f"https://www.{slug}fc.com",
        f"https://www.{slug}sc.com",
        f"https://{slug}.com",
        f"https://www.{slug}.org",
    ]
    
    # También probar con palabras separadas
    slug2 = club_name.lower().replace(' ', '')
    slug2 = re.sub(r'[^a-z0-9]', '', slug2)
    if slug2 != slug:
        urls_a_probar.extend([
            f"https://www.{slug2}.com",
            f"https://{slug2}.com",
        ])
    
    for url in urls_a_probar:
        try:
            driver.get(url)
            time.sleep(1.5)
            
            # Verificar que no sea página de error
            titulo = driver.title.lower()
            if 'not found' not in titulo and '404' not in titulo and 'error' not in titulo:
                # Verificar que tenga contenido relacionado con soccer
                html = driver.page_source.lower()
                if any(word in html for word in ['soccer', 'football', 'club', 'team', 'academy', 'player']):
                    return driver.current_url
        except:
            continue
    
    return None


def buscar_pagina_contacto(driver, base_url):
    """Busca la página de contacto o staff dentro del sitio"""
    
    keywords = ['staff', 'contact', 'about', 'team', 'coaches', 'leadership', 'directory', 'admin']
    
    try:
        # Buscar links en la página actual
        links = driver.find_elements(By.TAG_NAME, 'a')
        
        for link in links:
            try:
                href = link.get_attribute('href') or ''
                text = link.text.lower()
                
                for keyword in keywords:
                    if keyword in href.lower() or keyword in text:
                        full_url = urljoin(base_url, href)
                        return full_url
            except:
                continue
    except:
        pass
    
    return None


def extraer_emails(driver):
    """Extrae todos los emails de la página actual"""
    emails = set()
    
    try:
        html = driver.page_source
        encontrados = EMAIL_PATTERN.findall(html.lower())
        
        for email in encontrados:
            # Filtrar emails inválidos
            if not any(x in email for x in ['.png', '.jpg', '.gif', 'example.com', 'domain.com', 'email.com', 'wixpress', 'sentry']):
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
    """Clasifica emails por tipo (director vs general)"""
    director_email = None
    club_email = None
    
    for email in emails:
        email_lower = email.lower()
        
        # Buscar email de director
        if any(x in email_lower for x in ['director', 'doc', 'president', 'executive', 'admin']):
            if not director_email:
                director_email = email
        
        # Buscar email general
        if any(x in email_lower for x in ['info', 'contact', 'office', 'hello', 'general']):
            if not club_email:
                club_email = email
    
    # Si no encontramos específicos, usar el primero
    if not director_email and not club_email and emails:
        club_email = emails[0]
    
    return director_email, club_email


def scrape_club(driver, club_name):
    """Hace el scraping completo de un club"""
    
    resultado = {
        'Club': club_name,
        'Website': '',
        'Pagina Contacto': '',
        'Email Director': '',
        'Email Club': '',
        'Telefono': '',
        'Todos los Emails': '',
        'Estado': ''
    }
    
    try:
        # Paso 1: Buscar website
        website = buscar_website(driver, club_name)
        
        if not website:
            resultado['Estado'] = 'Website no encontrado'
            return resultado
        
        resultado['Website'] = website
        
        # Paso 2: Buscar página de contacto/staff
        pagina_contacto = buscar_pagina_contacto(driver, website)
        
        if pagina_contacto:
            resultado['Pagina Contacto'] = pagina_contacto
            driver.get(pagina_contacto)
            time.sleep(2)
        
        # Paso 3: Extraer emails de la página actual
        emails = extraer_emails(driver)
        
        # También extraer de la página principal si estamos en contacto
        if pagina_contacto:
            driver.get(website)
            time.sleep(1.5)
            emails.extend(extraer_emails(driver))
            emails = list(set(emails))  # Eliminar duplicados
        
        # Paso 4: Extraer teléfonos
        telefonos = extraer_telefonos(driver)
        
        # Paso 5: Clasificar emails
        director_email, club_email = clasificar_emails(emails)
        
        # Guardar resultados
        resultado['Email Director'] = director_email or ''
        resultado['Email Club'] = club_email or ''
        resultado['Telefono'] = telefonos[0] if telefonos else ''
        resultado['Todos los Emails'] = '; '.join(emails[:5])
        resultado['Estado'] = 'OK' if emails else 'Sin emails'
        
    except Exception as e:
        resultado['Estado'] = f'Error: {str(e)[:50]}'
    
    return resultado


def guardar_resultados(resultados, filename):
    """Guarda los resultados en Excel"""
    df = pd.DataFrame(resultados)
    df.to_excel(filename, index=False, sheet_name='Contactos')
    print(f"\nArchivo guardado: {filename}")


# ============================================
# PROGRAMA PRINCIPAL
# ============================================

def main():
    print("="*60)
    print("   MLS NEXT CLUB CONTACT SCRAPER")
    print("="*60)
    
    # Crear driver
    driver = crear_driver()
    
    try:
        # Obtener lista de clubes
        clubes = extraer_clubes_mls_next(driver)
        
        # Limitar para prueba (quitar o cambiar este número para procesar más)
        LIMITE = 10  # Cambiar a len(clubes) para procesar todos
        clubes = clubes[:LIMITE]
        
        print(f"\nProcesando {len(clubes)} clubes (limite de prueba)...")
        print("-"*60)
        
        resultados = []
        
        for i, club in enumerate(clubes, 1):
            print(f"\n[{i}/{len(clubes)}] {club}")
            
            resultado = scrape_club(driver, club)
            resultados.append(resultado)
            
            # Mostrar progreso
            if resultado['Email Director'] or resultado['Email Club']:
                print(f"    ✓ Email: {resultado['Email Director'] or resultado['Email Club']}")
            else:
                print(f"    ✗ {resultado['Estado']}")
            
            # Pausa entre clubes
            time.sleep(DELAY)
            
            # Guardar progreso cada 10 clubes
            if i % 10 == 0:
                guardar_resultados(resultados, "progreso_" + OUTPUT_FILE)
        
        # Guardar resultados finales
        guardar_resultados(resultados, OUTPUT_FILE)
        
        # Estadísticas
        print("\n" + "="*60)
        print("   COMPLETADO!")
        print("="*60)
        print(f"Total clubes procesados: {len(resultados)}")
        print(f"Con website encontrado: {len([r for r in resultados if r['Website']])}")
        print(f"Con email encontrado: {len([r for r in resultados if r['Email Director'] or r['Email Club']])}")
        
    finally:
        # Cerrar Chrome
        print("\nCerrando Chrome...")
        driver.quit()


if __name__ == "__main__":
    main()
