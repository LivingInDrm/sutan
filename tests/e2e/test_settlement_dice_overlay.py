from pathlib import Path
import os
from playwright.sync_api import Page, expect


def test_settlement_dice_overlay_no_black_screen(page: Page):
    base_url = os.environ.get('BASE_URL', 'http://127.0.0.1:5198')
    errors: list[str] = []
    console_messages: list[str] = []

    page.on('pageerror', lambda err: errors.append(str(err)))
    page.on('console', lambda msg: console_messages.append(f'{msg.type}: {msg.text}'))

    page.goto(base_url, wait_until='networkidle')
    page.get_by_role('button', name='启此新卷').click()
    page.wait_for_timeout(400)
    page.get_by_role('button', name='清凉山王府').click()
    page.wait_for_timeout(400)
    page.get_by_text('边境破茶摊・剑影初逢').click()
    page.wait_for_timeout(400)

    page.locator('text=徐凤年').last.dblclick()

    start_scene_button = page.get_by_role('button', name='落印启局')
    expect(start_scene_button).to_be_enabled()
    start_scene_button.click()
    page.wait_for_timeout(700)

    page.goto(f'{base_url}/?autotest=dice', wait_until='networkidle')
    page.wait_for_timeout(700)
    page.wait_for_timeout(700)

    page.get_by_role('button', name='开始鉴定').click()
    page.wait_for_timeout(7000)

    expect(page.locator('body')).to_contain_text('继续')
    assert not any('clear is not a function' in error for error in errors), errors
    assert not any('DataCloneError' in error for error in errors), errors
    assert not any('The above error occurred in the <DiceBoxOverlay>' in message for message in console_messages), console_messages

    screenshot_path = Path('/tmp/settlement-dice-overlay.png')
    page.screenshot(path=str(screenshot_path), full_page=True)
    assert screenshot_path.exists()