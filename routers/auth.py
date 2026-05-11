from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/session")
async def get_session():
    # Toggle 'is_authenticated' to False to test the unauthenticated state
    return {
        "is_authenticated": True,
        "user_name": "Zaid"
    }
