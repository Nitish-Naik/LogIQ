import redis

redis_client = redis.Redis(host='localhost', port=6379, db=0)

redis_client.set('name', 'Alice')

name = redis_client.get('name').decode('utf-8')
print(f"name : ", name)