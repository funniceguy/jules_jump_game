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
            print("Canvas found. Waiting for Preload & Render...")
            time.sleep(5) # Wait for PreloadScene and LobbyScene

            # Screenshot Lobby (Should see "JUMP GAME" and "PLAY NOW")
            page.screenshot(path="verification/lobby_cute.png")
            print("Lobby screenshot saved (verification/lobby_cute.png).")

            # Click Start Button (Center, approx 65% height)
            # 720/2 = 360, 1280*0.65 = 832
            print("Clicking PLAY NOW...")
            page.mouse.click(360, 832)

            # Wait for transition
            time.sleep(3)

            # Screenshot Game (Should see Timer on Top Right)
            page.screenshot(path="verification/game_cute.png")
            print("Game screenshot saved (verification/game_cute.png).")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
