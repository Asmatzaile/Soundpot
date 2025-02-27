import io
import json
from urllib.parse import unquote as decodeuri # because starlette doesn't decode spaces well
import logging
import uvicorn
from contextlib import asynccontextmanager

from pydub import AudioSegment

from fastapi import FastAPI, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

import model_controller as model
import library_controller as libctrl

logging.basicConfig(level=logging.DEBUG, format='%(levelname)s:\t%(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    libctrl.load(logging)
    model.load(logging)
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/library_metadata/")
async def serve_library_metadata():
    return libctrl.load()

@app.get("/library/{filename:path}")
async def serve_file(filename: str):
    filename = decodeuri(filename)
    path = libctrl.get_path(filename)
    if not path.exists():
        raise HTTPException(status_code=404)
    return FileResponse(path)

@app.post("/library/")
async def upload_sound(sound = File(...), origin = Query(None)):
    try:
        out_path = libctrl.reserve_file(origin)
    except:
        raise HTTPException(status_code=422, detail=f"Unknown origin: {origin}")
    content = await sound.read()
    buffer = io.BytesIO(content)
    audio = AudioSegment.from_file(buffer)
    audio.export(out_path, format="wav")
    return confirm_file(out_path.name)

@app.delete("/library/{filename:path}")
async def delete_sound(filename: str):
    filename = decodeuri(filename)
    libctrl.delete_sound(filename)

@app.post("/merge/")
async def merge_sounds(filename1 : str = Form(...), filename2 : str = Form(...)):
    filename1 = decodeuri(filename1)
    filename2 = decodeuri(filename2)
    [in_path1, in_path2, out_path] = libctrl.reserve_merge(filename1, filename2)
    logging.info(f"Merging sounds {filename1} and {filename2} into {out_path.name}")
    await model.interpolate_sounds(in_path1, in_path2, out_path)
    return confirm_file(out_path.name)

def confirm_file(filename):
    metadata = libctrl.confirm_file(filename)
    return [filename, metadata]

if __name__ == "__main__":
    with open('../config.json') as f:
        config = json.load(f)
    uvicorn.run("main:app", host="0.0.0.0", port=config["backend_port"])
