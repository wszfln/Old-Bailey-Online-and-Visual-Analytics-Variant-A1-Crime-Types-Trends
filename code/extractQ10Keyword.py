import os
import xml.etree.ElementTree as ET
import pandas as pd
import re

xml_folder = "D:/kcl/individual_project_code/data/sessionsPapers"

alcohol_keywords = [
    r"\bdrunk\b", r"\bdrunken(ness)?\b", r"\bintoxicated\b", r"\bintoxication\b",
    r"\bgin\b", r"\bbeer\b", r"\bale\b", r"\bwine\b", r"\brum\b", r"\bwhisky\b",
    r"\bv?odka\b", r"\bliquor\b", r"\bbrandy\b", r"\btavern\b", r"\bpublic\s+house\b",
    r"\bpublican\b", r"\bpub\b", r"\bbeerhouse\b", r"\balehouse\b", r"\bdrinking\b",
    r"\binebr[ii]ated\b", r"\bintemperate\b", r"\binebriate\b", r"\bintoxicating\s+liquor\b"
]
keywords = [k.lower() for k in alcohol_keywords]

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

                if any(re.search(k, text_content) for k in keywords):
                    results.append({
                        "trial_id": trial_id,
                        "filename": file,
                        "match_excerpt": text_content[:500]
                    })
        except ET.ParseError:
            continue  

df = pd.DataFrame(results)
df.to_csv("D:/kcl/individual_project_code/data/alcohol_related_offences.csv", index=False)

main_df = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data.csv")
alcohol_df = pd.read_csv("D:/kcl/individual_project_code/data/alcohol_related_offences.csv")
alcohol_trial_ids = set(alcohol_df["trial_id"].astype(str))
main_df["is_alcohol_related_crime"] = main_df["trial_id"].astype(str).apply(lambda x: "yes" if x in alcohol_trial_ids else "no")
main_df.to_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_alcohol_related_crimes.csv", index=False)