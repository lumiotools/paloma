import sys
sys.dont_write_bytecode = True
from dotenv import load_dotenv
load_dotenv()

import os
import uvicorn
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from src.routes.chatbot.router import router as chatbot_router
from src.routes.chatbot_v2.router import router as chatbot_router_v2

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chatbot_router,prefix="")
app.include_router(chatbot_router_v2,prefix="/v2")



# Test routes - donot expose them


@app.get("/")
async def root():
    return {"message": "Server is up and running!"}

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error occurred: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred. Please try again later."},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error occurred: {exc}")
    return JSONResponse(
        status_code=422,
        content={"error": "Validation error", "details": exc.errors()},
    )

if __name__ == "__main__":
    environment = os.getenv("ENVIRONMENT")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=(environment == "dev"))