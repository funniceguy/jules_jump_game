
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 412, 'height': 915})
        page = context.new_page()

        try:
            print("Navigating to game...")
            page.goto("http://localhost:5173")
            time.sleep(2)

            print("Starting Game...")
            page.mouse.click(206, 560)
            time.sleep(2)

            print("Taking UI Screenshot (Start)...")
            page.screenshot(path="/home/jules/verification/game_ui_new.png")

            print("Waiting 5 seconds...")
            time.sleep(5)

            print("Taking UI Screenshot (Later)...")
            page.screenshot(path="/home/jules/verification/game_ui_timer.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
