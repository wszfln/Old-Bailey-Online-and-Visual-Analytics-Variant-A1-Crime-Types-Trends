import pandas as pd

df = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_predicted_age.csv")

# Define classification dictionary
violent_categories = {
    "kill": ["infanticide", "manslaughter", "murder", "pettyTreason", "other"],
    "breakingPeace": ["assault", "riot", "wounding", "threateningBehaviour", "vagabond", "barratry", "libel", "other"],
    "violentTheft": ["robbery", "highwayRobbery", "other"],
    "sexual": ["rape", "indecentAssault", "sodomy", "assaultWithIntent", "assaultWithSodomiticalIntent"]
}
property_categories = {
    "theft": ["burglary", "embezzlement", "extortion", "grandLarceny", "pettyLarceny", "pocketpicking",
              "shoplifting", "stealingFromMaster", "theftFromPlace", "receiving"],
    "deception": ["fraud", "forgery", "perjury", "bankrupcy"],
    "damage": ["arson", "other"]
}

# Violent/Property Crime Category Aggregate
violent_set = set((cat, sub) for cat, subs in violent_categories.items() for sub in subs)
property_set = set((cat, sub) for cat, subs in property_categories.items() for sub in subs)

def classify_crime(row):
    key = (row["offence_category"], row["offence_subcategory"])
    if key in violent_set:
        return "violent"
    elif key in property_set:
        return "property"
    else:
        return "other"

df["crime_type"] = df.apply(classify_crime, axis=1)

# Add an age category column
def classify_age(age):
    try:
        age = float(age)
        if age < 18:
            return "juvenile(under 18)"
        elif age <= 25:
            return "youth(18-25)"
        elif age <= 40:
            return "adult(26-40)"
        elif age <= 60:
            return "middle aged(41-60)"
        else:
            return "elderly(60+)"
    except:
        return "unknown"

df["age_group"] = df["predicted_age"].apply(classify_age)
df.to_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_crime_and_age_group.csv", index=False)