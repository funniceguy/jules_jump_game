
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport
        context = browser.new_context(viewport={'width': 412, 'height': 915})
        page = context.new_page()

        try:
            print("Navigating to game...")
            page.goto("http://localhost:5173")
            time.sleep(2)

            print("Starting Game...")
            # Button is at 0.6 * height. 1280 * 0.6 = 768.
            # Scale factor: 915 / 1280 = 0.714.
            # Scaled Y: 768 * 0.714 = 548.
            # Center X: 206.
            # Click slightly lower to be safe.
            page.mouse.click(206, 560)

            time.sleep(2)

            print("Taking Game Controls Screenshot...")
            page.screenshot(path="/home/jules/verification/game_controls_final.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
