#!/usr/bin/env python3

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import shared
from routes import characters_router, common_router, items_router, scenes_router, ui_assets_router

app = FastAPI(title="Sutan Asset Manager API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for directory in (
    shared.SAMPLES_DIR,
    shared.PORTRAITS_SRC_DIR,
    shared.PORTRAITS_PUBLIC_DIR,
    shared.ITEMS_SRC_DIR,
    shared.ITEMS_PUBLIC_DIR,
    shared.MAPS_DIR,
    shared.GAME_PUBLIC_MAPS_DIR,
    shared.UI_ASSETS_SRC_DIR,
    shared.UI_ASSETS_PUBLIC_DIR,
):
    directory.mkdir(parents=True, exist_ok=True)

app.mount("/images", StaticFiles(directory=str(shared.SAMPLES_DIR)), name="images")
app.mount("/portraits", StaticFiles(directory=str(shared.PORTRAITS_PUBLIC_DIR)), name="portraits")
app.mount("/items", StaticFiles(directory=str(shared.ITEMS_PUBLIC_DIR)), name="item_assets")
app.mount("/maps", StaticFiles(directory=str(shared.MAPS_DIR)), name="map_assets")
app.mount("/game-maps", StaticFiles(directory=str(shared.GAME_PUBLIC_MAPS_DIR)), name="game_map_assets")
app.mount("/ui-assets", StaticFiles(directory=str(shared.UI_ASSETS_PUBLIC_DIR)), name="ui_assets")

for router in (common_router, characters_router, items_router, scenes_router, ui_assets_router):
    app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    shared._sync_special_workspace()
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)