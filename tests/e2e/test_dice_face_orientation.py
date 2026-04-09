from pathlib import Path
import os
from playwright.sync_api import Page, expect


def test_dice_face_orientation_captures(page: Page):
    base_url = os.environ.get('BASE_URL', 'http://127.0.0.1:5182')

    for face in range(1, 7):
        page.goto(f'{base_url}/dice-demo?faceCheck={face}', wait_until='networkidle')
        expect(page.get_by_role('heading', name='3D 骰子翻滚演示')).to_be_visible()
        page.screenshot(path=f'/tmp/dice-face-check-{face}.png', full_page=True)
        assert Path(f'/tmp/dice-face-check-{face}.png').exists()

    page.goto(f'{base_url}/dice-demo', wait_until='networkidle')
    expect(page.get_by_role('heading', name='3D 骰子翻滚演示')).to_be_visible()
    page.screenshot(path='/tmp/dice-final.png', full_page=True)
    assert Path('/tmp/dice-final.png').exists()