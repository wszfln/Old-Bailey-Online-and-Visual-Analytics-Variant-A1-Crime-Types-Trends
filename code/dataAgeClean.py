import pandas as pd
import re

input_file = "D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data.csv"
output_file = "D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_age_cleaned.csv"

# English-to-digital mapping (supports 1–100, basic table, extensible)
num_words = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80,
    "ninety": 90, "hundred": 100
}

def text_to_number(text):
    # Convert English numbers to integers, supporting simple combinations
    text = text.lower().replace("-", " ")
    parts = text.split()
    total = 0
    for p in parts:
        if p in num_words:
            total += num_words[p]
    return total if total > 0 else None

def clean_age(value):
    # If it is a number (including negative numbers), take the absolute value directly
    if isinstance(value, (int, float)) and not pd.isna(value):
        return abs(int(value))

    if isinstance(value, str):
        # Extract numbers
        numbers = list(map(int, re.findall(r"\d+", value)))
        # Extract English numbers
        words = re.findall(r"[A-Za-z]+", value)
        for word in words:
            num = text_to_number(word)
            if num:
                numbers.append(num)

        if numbers:
            return min(numbers)  # Interval/multiple values, take the minimum value
    return "unknown"

df = pd.read_csv(input_file)
df["defendants_age_cleaned"] = df["defendants_age"].apply(clean_age)
df.to_csv(output_file, index=False)
print(f"Saved cleaned files to: {output_file}, add a new column defendants_age_cleaned")