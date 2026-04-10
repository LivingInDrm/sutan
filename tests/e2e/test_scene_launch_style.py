from pathlib import Path
import os
from playwright.sync_api import Page, expect


def test_scene_launch_style_capture(page: Page):
    base_url = os.environ.get('BASE_URL', 'http://127.0.0.1:5198')

    page.goto(base_url, wait_until='networkidle')
    expect(page.get_by_text('雪中悍刀行')).to_be_visible()

    page.get_by_role('button', name='启此新卷').click()
    page.wait_for_load_state('networkidle')

    page.get_by_role('button', name='清凉山王府').click()
    page.wait_for_load_state('networkidle')

    page.get_by_role('button', name='提卷入局 →').click()
    page.wait_for_load_state('networkidle')

    expect(page.get_by_role('button', name='落印启局')).to_be_visible()
    expect(page.locator('body')).to_contain_text('案上印位')
    expect(page.locator('#root')).not_to_be_empty()

    page.screenshot(path='/tmp/scene-launch-style-optimized.png', full_page=True)
    assert Path('/tmp/scene-launch-style-optimized.png').exists()