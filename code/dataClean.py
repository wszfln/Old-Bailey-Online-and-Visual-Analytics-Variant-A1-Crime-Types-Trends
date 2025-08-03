import zipfile
import os
import xml.etree.ElementTree as ET
import pandas as pd
# import seaborn as sns
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder

# Define ZIP file path and extraction directory
zip_path = "D:/kcl/individual_project_code/data/sessionsPapers.zip"
extract_path = "D:/kcl/individual_project_code/data/dataSource"

# Unzip the file
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(extract_path)

# Get all XML file paths
xml_files = [os.path.join(extract_path, f) for f in os.listdir(extract_path) if f.endswith('.xml')]

def parse_old_bailey_xml(file_path):
    from datetime import datetime
    import re
    import xml.etree.ElementTree as ET
    import pandas as pd

    # Extraction date
    filename = os.path.splitext(os.path.basename(file_path))[0]
    digits_only = re.findall(r'\d+', filename)
    if not digits_only:
        session_date = pd.NaT
    else:
        raw_date_str = digits_only[0]
        if len(raw_date_str) == 7:
            year = int('16' + raw_date_str[:2])
            month = int(raw_date_str[2:4])
            day = int(raw_date_str[4:6])
        elif len(raw_date_str) == 8:
            year = int(raw_date_str[:4])
            month = int(raw_date_str[4:6])
            day = int(raw_date_str[6:8])
        else:
            session_date = pd.NaT
            year, month, day = None, None, None
        try:
            session_date = datetime(year, month, day).date()
        except:
            session_date = pd.NaT

    tree = ET.parse(file_path)
    root = tree.getroot()
    records = []

    for trial in root.findall(".//div1[@type='trialAccount']"):
        trial_id = trial.get("id", "Unknown")

        # Default value
        age = gender = occupation = "Unknown"
        offence_id = offence_text = category = subcategory = "Unknown"
        verdicts_category = verdicts_subcategory = "Unknown"
        sentences_category = sentences_subcategory = "Unknown"

        # Extract defendant information
        defendant = trial.find(".//persName[@type='defendantName']")
        if defendant is not None:
            age_tag = defendant.find("./interp[@type='age']")
            gender_tag = defendant.find("./interp[@type='gender']")
            occupation_tag = defendant.find("./interp[@type='occupation']")
            if age_tag is not None:
                age = age_tag.get("value", "Unknown")
            if gender_tag is not None:
                gender = gender_tag.get("value", "Unknown")
            if occupation_tag is not None:
                occupation = occupation_tag.get("value", "Unknown")

        # Extract crime
        offence = trial.find(".//rs[@type='offenceDescription']")
        if offence is not None:
            offence_id = offence.get("id", "Unknown")
            offence_text = offence.text.strip() if offence.text else "Unknown"
            offence_category = offence.find("./interp[@type='offenceCategory']")
            offence_subcategory = offence.find("./interp[@type='offenceSubcategory']")
            category = offence_category.get("value", "Unknown") if offence_category is not None else "Unknown"
            subcategory = offence_subcategory.get("value", "Unknown") if offence_subcategory is not None else "Unknown"

        # Extract judgment
        verdict = trial.find(".//rs[@type='verdictDescription']")
        if verdict is not None:
            verdict_tag = verdict.find("./interp[@type='verdictCategory']")
            verdict_sub_tag = verdict.find("./interp[@type='verdictSubcategory']")
            verdicts_category = verdict_tag.get("value", "Unknown") if verdict_tag is not None else "Unknown"
            verdicts_subcategory = verdict_sub_tag.get("value", "Unknown") if verdict_sub_tag is not None else "Unknown"

        # Extraction punishment
        sentence = trial.find(".//rs[@type='punishmentDescription']")
        if sentence is not None:
            sentence_tag = sentence.find("./interp[@type='punishmentCategory']")
            sentence_sub_tag = sentence.find("./interp[@type='punishmentSubcategory']")
            sentences_category = sentence_tag.get("value", "Unknown") if sentence_tag is not None else "Unknown"
            sentences_subcategory = sentence_sub_tag.get("value", "Unknown") if sentence_sub_tag is not None else "Unknown"

        # Add record
        records.append({
            "trial_id": trial_id,
            "session_date": session_date,
            "defendants_age": age,
            "defendants_gender": gender,
            "defendants_occupation": occupation,
            "offence_id": offence_id,
            "offence_text": offence_text,
            "offence_category": category,
            "offence_subcategory": subcategory,
            "verdicts_category": verdicts_category,
            "verdicts_subcategory": verdicts_subcategory,
            "sentences_category": sentences_category,
            "sentences_subcategory": sentences_subcategory
        })

    return records

#Process XML files in manageable batches and save incrementally
batch_size = 100
csv_output_path = "D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data.csv"

# Initialize empty DataFrame for storage
columns = [
    "trial_id", "session_date", "defendants_age", "defendants_gender", "defendants_occupation",
    "offence_id", "offence_text", "offence_category", "offence_subcategory",
    "verdicts_category", "verdicts_subcategory", "sentences_category", "sentences_subcategory"
]
df_storage = pd.DataFrame(columns=columns)

for i in range(0, len(xml_files), batch_size):
    batch_files = xml_files[i:i + batch_size]
    batch_records = []
    
    for file in batch_files:
        batch_records.extend(parse_old_bailey_xml(file))

    df_batch = pd.DataFrame(batch_records)

    # Append new data instead of overwriting
    if i == 0:
        df_batch.to_csv(csv_output_path, index=False, mode="w", header=True)  
    else:
        df_batch.to_csv(csv_output_path, index=False, mode="a", header=False) 

    print(f"Processed {i + len(batch_files)} files, data saved to {csv_output_path}")


# Integrate Decision Tree Prediction for sentences_category
df = pd.read_csv(csv_output_path)
df["year"] = df["session_date"].astype(str).str[:4]
df["year"] = pd.to_numeric(df["year"], errors="coerce")

features = ["year", "offence_category", "offence_subcategory", "verdicts_category", "defendants_gender"]
target = "sentences_category"

encoders = {}
for col in features:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le

known = df[df[target].str.lower() != "unknown"].copy()
unknown = df[df[target].str.lower() == "unknown"].copy()

target_le = LabelEncoder()
known[target] = target_le.fit_transform(known[target].astype(str))

X_train, X_val, y_train, y_val = train_test_split(
    known[features], known[target], test_size=0.2, random_state=42, stratify=known[target]
)
clf = DecisionTreeClassifier(max_depth=5, min_samples_leaf=10, random_state=42)
clf.fit(X_train, y_train)

if not unknown.empty:
    unknown_pred = clf.predict(unknown[features])
    unknown[target] = target_le.inverse_transform(unknown_pred)
    unknown["sentence_source"] = "predicted"

# Restore the encoded category columns
for col, le in encoders.items():
    df[col] = le.inverse_transform(df[col].astype(int))
known[target] = target_le.inverse_transform(known[target])
known["sentence_source"] = "original"
q3_filled = pd.concat([known, unknown], ignore_index=True)

mask_unknown = q3_filled["sentences_category"].str.lower() == "unknown"
q3_filled.loc[mask_unknown, "sentence_source"] = "unknown"

q3_filled.to_csv("D:/kcl/individual_project_code/data/q3_sentences_predicted.csv", index=False)


# Merge the prediction results into new_cleaned_old_bailey_data.csv
original_df = pd.read_csv(csv_output_path)
pred_df = q3_filled[["trial_id", "sentences_category", "sentence_source"]]

# Merge by trial_id, overwrite sentences_category, and add sentence_source
merged_df = original_df.drop(columns=["sentences_category"], errors="ignore").merge(pred_df, on="trial_id", how="left")
merged_output_path = "D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_predicted_sentences.csv"
merged_df.to_csv(merged_output_path, index=False)