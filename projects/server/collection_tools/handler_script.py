import pandas as pd
from prisma import Prisma
from datetime import datetime

# Initialize Prisma client
# client = Prisma()

async def main():
    prisma = Prisma()
    await prisma.connect()

    # Load data from CSV
    df = pd.read_csv('users_1.csv')
    subjects = []
    

    
    # Process data and prepare for bulk insertion
    for _, row in df.iterrows():
        try:
            # Ensure all date parts are integers and not NaN; otherwise, set date_of_birth to None
            if pd.notna(row['year_of_birth']) and pd.notna(row['month_of_birth']) and pd.notna(row['day_of_birth']):
                print(row['year_of_birth'] ,row['month_of_birth'] , row['day_of_birth'] )
                date_of_birth = datetime(
                    int(row['year_of_birth']),
                    int(row['month_of_birth']),
                    int(row['day_of_birth'])
                )
                print(date_of_birth)
            else:
                date_of_birth = None
        except ValueError:
            # Handle cases where the date parts are invalid (like February 30th)
            date_of_birth = None
        
        await prisma.subject.create({
            'gov_id': str(row.get('gov_id', '')),
            'phone': str(row.get('phone', '')),
            'first_name': str(row.get('first_name', '')),
            'middle_name': str(row.get('middle_name', '')),
            'last_name': str(row.get('last_name', '')),
            'date_of_birth': date_of_birth ,  # Handle None differently if date_of_birth is null
            'mother_name': str(row.get('mother_name', '')),
            'father_name': str(row.get('father_name', '')),
            'sex': str(row.get('sex', '')),
            'street': str(row.get('street', '')),
            'city': str(row.get('city', '')),
            'postal_code': str(row.get('postal_code', '')),
            'country': str(row.get('country', ''))
        })
        

    await prisma.disconnect()

# Run the main function with asyncio
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
# from prisma import Prisma

# client = Prisma()

# async def main():
#     await client.connect()
#     print("Connected to database.")
#     await client.disconnect()

# if __name__ == '__main__':
#     import asyncio
#     asyncio.run(main())