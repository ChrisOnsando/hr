from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_default_database()
    await db.interviews.create_index("created_at")
    await db.interviews.create_index("status")
    print(" Connected to MongoDB")


async def close_db():
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB")


def get_db():
    return db
