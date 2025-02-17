import psycopg2
from psycopg2.extras import RealDictCursor

DB_USER = "postgres"
DB_PASSWORD = "12345"
DB_HOST = "localhost"
DB_NAME = "haircheck"

conn = psycopg2.connect(
    user=DB_USER, password=DB_PASSWORD, host=DB_HOST, database=DB_NAME
)
