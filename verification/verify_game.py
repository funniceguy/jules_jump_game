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
            print("Canvas found. Waiting for render...")
            time.sleep(3) # Wait for Phaser scene to create

            # Screenshot Lobby
            page.screenshot(path="verification/lobby.png")
            print("Lobby screenshot saved.")

            # Click Start Button (approx coords: 360, 768)
            print("Clicking Start Game...")
            page.mouse.click(360, 768)

            # Wait for transition
            time.sleep(2)

            # Screenshot Game
            page.screenshot(path="verification/game_verified.png")
            print("Game screenshot saved to verification/game_verified.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
