"""
Getmobil mock API yük testi (Locust).

WireMock mock backend'ine karşı tam CRUD yükü üretir — üretim ortamına
dokunmadan backend performans karakteristiğini ölçer.

Çalıştırma (headless):
  locust -f backend/locustfile.py --headless -u 10 -r 5 -t 15s \
         --host http://localhost:8089 --json
"""
from locust import HttpUser, task, between


class GetmobilApiUser(HttpUser):
    """Tipik bir API tüketicisinin davranışı: ağırlıklı okuma, ara sıra yazma."""

    wait_time = between(0.1, 0.5)

    @task(5)
    def list_products(self):
        self.client.get("/api/products", name="GET /api/products")

    @task(4)
    def product_detail(self):
        # Dinamik mock: her id için farklı yanıt üretir
        self.client.get("/api/products/837", name="GET /api/products/{id}")

    @task(2)
    def create_product(self):
        self.client.post(
            "/api/products",
            json={"name": "Locust iPhone", "price": 12345},
            name="POST /api/products",
        )

    @task(1)
    def update_product(self):
        self.client.put(
            "/api/products/837",
            json={"name": "Locust Güncel", "price": 9999},
            name="PUT /api/products/{id}",
        )

    @task(1)
    def patch_product(self):
        self.client.patch(
            "/api/products/837",
            json={"price": 8888},
            name="PATCH /api/products/{id}",
        )

    @task(1)
    def delete_product(self):
        self.client.delete("/api/products/837", name="DELETE /api/products/{id}")

    @task(1)
    def health(self):
        self.client.get("/api/health", name="GET /api/health")
