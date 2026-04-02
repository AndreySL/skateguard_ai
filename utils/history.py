import json
from typing import List, Dict
from config import HISTORY_FILE

def load_history() -> List[Dict]:
    if not HISTORY_FILE.exists():
        return []
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []

def save_history(history: List[Dict]):
    try:
        # Ограничиваем историю 100 записями
        history = history[:100]
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Ошибка сохранения истории: {e}")

def add_to_history(entry: Dict) -> Dict:
    history = load_history()
    history.insert(0, entry)
    save_history(history)
    return entry