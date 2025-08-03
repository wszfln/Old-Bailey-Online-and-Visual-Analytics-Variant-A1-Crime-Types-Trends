import os
import xml.etree.ElementTree as ET
import pandas as pd

xml_folder = "D:/kcl/individual_project_code/data/sessionsPapers"

necessity_keywords = [
    "hunger", "hungry", "starving", "bread", "food", "steal", "stole",
    "soup", "poverty", "necessity", "survive", "living", "poor", "no money",
    "milk", "cheese", "meat", "butter", "potatoes", "loaf", "stealing", "for want"
]
keywords = [k.lower() for k in necessity_keywords]

results = []

# Iterate through all XML files
for file in os.listdir(xml_folder):
    if file.endswith(".xml"):
        file_path = os.path.join(xml_folder, file)
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()

            for div1 in root.findall(".//div1[@type='trialAccount']"):
                trial_id = div1.attrib.get("id", "")
                text_content = ET.tostring(div1, encoding="utf-8").decode("utf-8").lower()

                if any(k in text_content for k in keywords):
                    results.append({
                        "trial_id": trial_id,
                        "filename": file,
                        "match_excerpt": text_content[:500]
                    })
        except ET.ParseError:
            continue  

df = pd.DataFrame(results)
df.to_csv("D:/kcl/individual_project_code/data/necessity_crimes_extracted.csv", index=False)

main_df = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data.csv")
necessity_df = pd.read_csv("D:/kcl/individual_project_code/data/necessity_crimes_extracted.csv")
necessity_trial_ids = set(necessity_df["trial_id"].astype(str))
main_df["is_necessity_crime"] = main_df["trial_id"].astype(str).apply(lambda x: "yes" if x in necessity_trial_ids else "no")
main_df.to_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_necessity_crimes.csv", index=False)