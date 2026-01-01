from playwright.sync_api import sync_playwright
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 720, "height": 1280})

        try:
            print("Navigating to app...")
            page.goto("http://localhost:5175")

            # Wait for canvas
            page.wait_for_selector("canvas")
            time.sleep(2)

            # Screenshot Lobby
            page.screenshot(path="verification/lobby_ui_fix.png")
            print("Lobby screenshot saved.")

            # Click PLAY NOW (Center)
            print("Clicking PLAY NOW...")
            page.mouse.click(360, 832)

            time.sleep(2)

            # Screenshot Game (Debug Mode)
            page.screenshot(path="verification/game_ui_fix.png")
            print("Game screenshot saved.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
