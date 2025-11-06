import random
import time
from locust import HttpUser, task, between

class SuperlitUser(HttpUser):
    # wait_time = between(1, 5)  # VUs will wait 1-5 seconds between tasks

    def generate_log_entry(self, srn, question_id):
        """
        Generates a single, realistic log entry.
        """
        log_type = random.choice(['checkpoint', 'insert', 'delete', 'run', 'submission'])
        content = ""
        code = ""
        num_chars = 0

        if log_type in ['insert', 'delete']:
            num_chars = random.randint(1, 25)
            content = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz ,.();', k=num_chars))
        elif log_type in ['run', 'submission']:
            # Simulate a larger code block
            code_length = random.randint(200, 3000)
            code = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz ,.();\n\t{}[]', k=code_length))

        return {
            "type": log_type,
            "srn": srn,
            "questionID": question_id,
            "ts": int(time.time() * 1000),  # epoch ms
            "content": content,
            "code": code,
            "offset": random.randint(0, 5000),
            "numCharacters": num_chars,
            "isPaste": random.random() < 0.05,  # 5% chance of being a paste event
        }

    @task
    def send_capstone_logs(self):
        """
        Simulates a user sending a batch of 150 log events.
        """
        # Each virtual user simulates a unique student
        srn = f"PES2UG24CS{random.randint(100, 999):03d}"
        question_id = random.randint(1, 10)

        log_entries = [self.generate_log_entry(srn, question_id) for _ in range(150)]

        payload = {
            "logs": log_entries
        }

        self.client.post(
            "/capstone-logi",
            json=payload,
            headers={"Content-Type": "application/json"},
            name="/capstone-logi" # Group all these requests under a single name in Locust UI
        )
