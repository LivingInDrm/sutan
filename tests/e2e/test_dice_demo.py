from pathlib import Path
import os
from playwright.sync_api import Page, expect


def test_dice_demo_page(page: Page):
    base_url = os.environ.get('BASE_URL', 'http://127.0.0.1:5182')
    page.goto(f'{base_url}/dice-demo', wait_until='networkidle')
    expect(page.get_by_role('heading', name='3D 骰子翻滚演示')).to_be_visible()
    expect(page.get_by_text('React Three Fiber Dice Demo')).to_be_visible()
    page.get_by_role('button', name='掷骰子').click()
    page.wait_for_timeout(1800)
    expect(page.get_by_text('总和：')).to_be_visible()
    page.screenshot(path='/tmp/dice-rounded.png', full_page=True)
    assert Path('/tmp/dice-rounded.png').exists()
