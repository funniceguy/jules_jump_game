
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

            print("Lobby Screenshot...")
            page.screenshot(path="/home/jules/verification/lobby_ui.png")

            # Click Story Button (Left Bottom)
            # Width 412. 1/3 = 137. Center of first third = ~68. Y = 915 - 50 = 865.
            print("Clicking Story...")
            page.mouse.click(68, 865)
            time.sleep(1)
            page.screenshot(path="/home/jules/verification/story_scene.png")

            # Click Back (Center Bottom usually in subscenes)
            print("Clicking Back...")
            page.mouse.click(206, 835)
            time.sleep(1)

            # Click Achievement (Right Bottom)
            # Center of last third = 412 - 68 = 344.
            print("Clicking Achievement...")
            page.mouse.click(344, 865)
            time.sleep(1)
            page.screenshot(path="/home/jules/verification/achieve_scene.png")

            # Click Back
            page.mouse.click(206, 835)
            time.sleep(1)

            # Start Game
            print("Starting Game...")
            page.mouse.click(206, 550) # Start button
            time.sleep(3)

            print("Game Screenshot...")
            page.screenshot(path="/home/jules/verification/game_combat.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
