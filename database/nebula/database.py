import os
import json
import sqlite3
from typing import Any, List, Dict

class Database:
    def __init__(self):
        try:
            with open("config.json", "r") as f:
                self.config = json.load(f)
        except FileNotFoundError:
            self.config = dict()
            self.config["db_path"] = ""

        self.db = sqlite3.connect(os.path.join(self.config["db_path"], "nebula.db"), check_same_thread=False)
        self.cursor = self.db.cursor()

    def create_table(self):
        self.cursor.execute(
            """
            CREATE TABLE Users (
                id TEXT,
                xp INTEGER,
                rep INTEGER,
                balance INTEGER,
                color TEXT,
                lastRep INTEGER
            );
            """
        )

    def add_user(self, user_id: str):
        self.cursor.execute(
            f"""
            INSERT INTO Users
            VALUES ('{user_id}', 0, 0, 1000000, '#0099ff', 0);
            """
        )

        self.db.commit()

    def add_column(self, column_name: str, data_type: str, default_value: Any):
        self.cursor.execute(
            f"""
            ALTER TABLE Users ADD COLUMN {column_name} {data_type} DEFAULT {default_value}
            """
        )

    def update_user_column(self, user_id: str, column: str, value: Any):
        self.cursor.execute(
            f"""
            UPDATE Users
            SET {column} = {value}
            WHERE id = '{user_id}';
            """
        )

        self.db.commit()

    def update_user_column_increment(self, user_id: str, column: str, change: int):
        self.cursor.execute(
            f"""
            UPDATE Users
            SET {column} = {column} + {change}
            WHERE id = '{user_id}';
            """
        )

        self.db.commit()

    def update_user_columns(self, user_id: str, columns_values: Dict[str, Any]):
        compound_set: str = ""
        keys: List[str] = list(columns_values.keys())
        values: List[Any] = list(columns_values.values())

        for i in range(len(keys)):
            compound_set += f"{keys[i]} = {values[i]}"

            if not i == len(keys) - 1:
                compound_set += ", "

        self.cursor.execute(
            f"""
            UPDATE Users
            SET {compound_set}
            WHERE id = '{user_id}';
            """
        )

        self.db.commit()

    def fetch_user(self, user_id: str): 
        column_data = self.cursor.execute(
            f"""
            SELECT * FROM Users WHERE id = '{user_id}';
            """
        ).fetchone()

        return column_data


    def fetch_user_column(self, user_id: str, column: str):
        column_data = self.cursor.execute(
            f"""
            SELECT {column} FROM Users WHERE id = '{user_id}';
            """
        ).fetchone()

        return column_data

    def fetch_user_columns(self, user_id: str, columns: List[str]):
        columns_data = self.cursor.execute(
            f"""
            SELECT {', '.join(columns)} FROM Users WHERE id = '{user_id}';
            """
        ).fetchone()

        return columns_data

    def delete_user(self, user_id: str):
        self.cursor.execute(
            f"""
            DELETE FROM Users WHERE id = '{user_id}';
            """
        )

    def commit_changes(self):
        self.db.commit

    def dispose(self):
        self.cursor.close()
        self.db.close()