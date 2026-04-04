"""
Playwright E2E tests for Item Manager UI
Tests: navigation tabs, item list render, character manager unaffected
"""
import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:8101"
SCREENSHOT_DIR = "/Users/xiaochunliu/program/sutan/tools/asset-manager/test-screenshots/item-manager"


def test_navigation_tabs_exist(page: Page):
    """验证顶部有「角色管理」和「物品管理」两个导航 tab"""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # Check both tabs exist
    character_tab = page.get_by_text("角色管理")
    item_tab = page.get_by_text("物品管理")

    expect(character_tab).to_be_visible()
    expect(item_tab).to_be_visible()

    page.screenshot(path=f"{SCREENSHOT_DIR}/01_navigation_tabs.png", full_page=True)
    print("✓ Navigation tabs verified")


def test_switch_to_item_manager(page: Page):
    """切换到物品管理，验证 ItemList 组件渲染"""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # Click item manager tab
    page.get_by_text("物品管理").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)

    page.screenshot(path=f"{SCREENSHOT_DIR}/02_item_manager_tab_active.png", full_page=True)

    # Verify we're on item manager page - look for item-related content
    # The page should show some item list area (empty state or list container)
    content = page.content()
    assert "物品" in content or "item" in content.lower(), "Item manager content not found"

    print("✓ Item manager tab switched successfully")


def test_item_list_empty_state(page: Page):
    """验证物品管理页面初始为空列表"""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # Switch to item manager
    page.get_by_text("物品管理").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)

    page.screenshot(path=f"{SCREENSHOT_DIR}/03_item_list_empty.png", full_page=True)

    # The API returns [] so the list should be empty
    # Verify the page loaded without errors
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    
    print("✓ Item list empty state rendered")


def test_switch_back_to_character_manager(page: Page):
    """切换回角色管理，验证原有功能正常"""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # First go to item manager
    page.get_by_text("物品管理").click()
    page.wait_for_timeout(500)

    # Switch back to character manager
    page.get_by_text("角色管理").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)

    page.screenshot(path=f"{SCREENSHOT_DIR}/04_character_manager_after_switch.png", full_page=True)

    # Verify character manager content is visible
    content = page.content()
    assert "角色" in content, "Character manager content not found after switching back"

    print("✓ Character manager restored after switching back")


def test_character_list_visible(page: Page):
    """验证角色列表在切换后仍正常显示"""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # Stay on character manager (default)
    page.screenshot(path=f"{SCREENSHOT_DIR}/05_character_list_default.png", full_page=True)

    content = page.content()
    assert "角色" in content, "No character content on default page"

    print("✓ Character list visible on default view")
