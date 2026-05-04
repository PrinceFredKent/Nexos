import asyncio
from sync_service import run_sync

async def main():
    print("Triggering manual sync to push local users to Supabase...")
    result = await run_sync()
    print(f"Sync result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
