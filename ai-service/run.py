# """
# Convenience script to run the AI Service with Uvicorn.

# Usage:
#     python run.py
#     python run.py --port 8000 --reload
# """

# import argparse
# import uvicorn


# def main() -> None:
#     parser = argparse.ArgumentParser(description="Run the AI Service")
#     parser.add_argument("--host", default="0.0.0.0", help="Bind host")
#     parser.add_argument("--port", type=int, default=8000, help="Bind port")
#     parser.add_argument("--reload", action="store_true", help="Auto-reload on code changes")
#     args = parser.parse_args()

#     uvicorn.run(
#         "app.main:app",
#         host=args.host,
#         port=args.port,
#         reload=args.reload,
#         log_level="info",
#     )


# if __name__ == "__main__":
#     main()

import uvicorn


def main():
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,       # auto reload when editing code
        log_level="info"
    )


if __name__ == "__main__":
    main()