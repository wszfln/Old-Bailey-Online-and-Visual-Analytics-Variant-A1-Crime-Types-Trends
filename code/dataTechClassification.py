import pandas as pd

df = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data.csv")

# Mapping relationship between technology and crime subcategories
tech_crime_map = {
    "railway": [
        "highwayRobbery", "robbery", "shoplifting", "pocketpicking", "receiving", "stealingFromMaster"
    ],
    "printing_media": [
        "libel", "seditiousLibel", "seditiousWords", "forgery"
    ],
    "banking": [
        "fraud", "forgery", "perjury", "embezzlement"
    ],
    "postal": [
        "mail", "receiving"
    ],
    "gas_lighting": [
        "rape", "indecentAssault", "robbery"
    ]
}

# Define classification function
def classify_technology(row):
    matched_techs = []
    for tech, subcats in tech_crime_map.items():
        if pd.notna(row["offence_subcategory"]) and row["offence_subcategory"] in subcats:
            matched_techs.append(tech)
    return ",".join(matched_techs) if matched_techs else "none"

df["technology_related_crime"] = df.apply(classify_technology, axis=1)
df.to_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_tech_labels.csv", index=False)