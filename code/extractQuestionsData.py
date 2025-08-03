import pandas as pd
import os
import numpy as np

# Load cleaned Old Bailey data
input_path = "D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data.csv"
df = pd.read_csv(input_path, parse_dates=["session_date"], dayfirst=True)

# Question 1: Frequency of different crime types over time
q1 = df[["session_date", "offence_category", "offence_subcategory"]].dropna()
q1["year"] = q1["session_date"].astype(str).str[:4]
q1["year"] = pd.to_numeric(q1["year"], errors="coerce")

# Output directory
output_dir = "D:/kcl/individual_project_code/code/static/data"
os.makedirs(output_dir, exist_ok=True)

# Offence category
df_off = q1.groupby(["year", "offence_category"]).size().unstack(fill_value=0).reset_index()
df_off.to_json(f"{output_dir}/q1_offence_category.json", orient="records")

# Offence subcategory
df_subOff = q1.groupby(["year", "offence_subcategory"]).size().unstack(fill_value=0).reset_index()
df_subOff.to_json(f"{output_dir}/q1_offence_subcategory.json", orient="records")

# Mapping relationship between offence category and offence subcategory (for filtering)
category_map = df.dropna(subset=["offence_category", "offence_subcategory"])
category_to_subcats = category_map.groupby("offence_category")["offence_subcategory"].unique().apply(list).to_dict()
with open(f"{output_dir}/q1_offence_map.json", "w", encoding="utf-8") as f:
    import json
    json.dump(category_to_subcats, f, ensure_ascii=False, indent=2)

# Question 2: Violent vs non-violent crimes over time
violent_categories = ["breakingPeace", "kill", "sexual", "violentTheft", "miscellaneous"]

# The specific violent subclasses in the miscellaneous subclass are reserved as violent, and the rest are classified as non-violent
violent_misc_subcategories = ["kidnapping", "illegalAbortion"]
def classify_violence(row):
    cat = row["offence_category"]
    subcat = row["offence_subcategory"]
    if pd.isna(cat) or pd.isna(subcat) or cat.lower() == "unknown":
        return "unknown"
    if cat == "miscellaneous":
        return "violent" if subcat in violent_misc_subcategories else "non-violent"
    return "violent" if cat in violent_categories else "non-violent"
q2 = df.dropna(subset=["session_date"]).copy()
q2["year"] = q2["session_date"].astype(str).str[:4]
q2["year"] = pd.to_numeric(q2["year"], errors="coerce")
q2["crime_type"] = q2.apply(classify_violence, axis=1)

# Group and calculate the number of each type each year
q2_grouped = (
    q2.groupby(["year", "crime_type"])
      .size()
      .reset_index(name="count")
      .pivot(index="year", columns="crime_type", values="count")
      .fillna(0)
)
for col in ["violent", "non-violent", "unknown"]:
    if col not in q2_grouped.columns:
        q2_grouped[col] = 0
q2_grouped["Total"] = q2_grouped[["violent", "non-violent", "unknown"]].sum(axis=1)
q2_grouped["violent"] = (q2_grouped["violent"] / q2_grouped["Total"]).round(3)
q2_grouped["non-violent"] = (q2_grouped["non-violent"] / q2_grouped["Total"]).round(3)
q2_grouped["unknown"] = (q2_grouped["unknown"] / q2_grouped["Total"]).round(3)
q2_grouped[["violent", "non-violent", "unknown"]].reset_index().to_json(f"{output_dir}/q2_violent_vs_nonviolent.json", orient="records")

# Output category info
q2_categories_info = {
    "violent": {
        "categories": ["breakingPeace", "kill", "sexual", "violentTheft", "miscellaneous"],
        "subcategories_miscellaneous": ["kidnapping", "illegalAbortion"]
    },
    "nonViolent": {
        "categories": ["theft", "deception", "damage", "royalOffences", "miscellaneous"],
        "subcategories_miscellaneous": ["concealingABirth", "conspiracy", "habitualCriminal", "pervertingJustice", "piracy", "returnFromTransportation", "other"]
    }
}
import json
with open(f"{output_dir}/q2_category_info.json", "w", encoding="utf-8") as f:
    json.dump(q2_categories_info, f, ensure_ascii=False, indent=2)

# Question 3: Capital crimes (e.g., death sentences) over time
q3_original = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data.csv")
q3_predicted = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_predicted_sentences.csv")

for df_data, (output_name, source_label) in [
    (q3_original, ("q3_capital_crimes.json", "Original")),
    (q3_predicted, ("q3_capital_crimes_predicted.json", "Predicted"))]:
    q3 = df_data.dropna(subset=["session_date", "sentences_category", "offence_category"]).copy()
    q3["year"] = q3["session_date"].astype(str).str[:4]
    q3["year"] = pd.to_numeric(q3["year"], errors="coerce")
    q3 = q3.dropna(subset=["year"])
    q3["is_capital"] = q3["sentences_category"].str.lower().str.contains("death")

    overall = (
        q3.groupby("year")
          .agg(total=("sentences_category", "count"), capital=("is_capital", "sum"))
          .assign(capital_rate=lambda x: (x["capital"] / x["total"]).round(3))
          .reset_index()
          .assign(category="All")
    )

    by_cat = (
        q3.groupby(["year", "offence_category"])
          .agg(total=("sentences_category", "count"), capital=("is_capital", "sum"))
          .assign(capital_rate=lambda x: (x["capital"] / x["total"]).round(3))
          .reset_index()
          .rename(columns={"offence_category": "category"})
    )

    final = pd.concat([overall, by_cat], ignore_index=True)
    final["source"] = source_label
    # Tooltip-ready fields: include year, capital_rate, source, category
    final["tooltip_info"] = final.apply(lambda r: f"Year: {int(r['year'])} | Capital crime rate: {r['capital_rate']*100:.1f}% | Source: {r['source']}", axis=1)
    final.to_json(f"{output_dir}/{output_name}", orient="records")

# Generate annual judgment loss rate data
q3_missing = df.copy()
q3_missing["session_date"] = pd.to_datetime(q3_missing["session_date"], errors="coerce")
q3_missing["year"] = q3_missing["session_date"].astype(str).str[:4]
q3_missing["year"] = pd.to_numeric(q3_missing["year"], errors="coerce")

q3_missing["is_unknown"] = q3_missing["sentences_category"].str.lower() == "unknown"

missing_grouped = (
    q3_missing.groupby(["year", "offence_category"])
    .agg(total=("sentences_category", "count"),
         missing=("is_unknown", "sum"))
    .reset_index()
)
missing_grouped["missing_rate"] = (
    missing_grouped["missing"] / missing_grouped["total"].replace(0, 1)
)
missing_grouped.rename(columns={"offence_category": "category"}, inplace=True)
missing_grouped.to_json(f"{output_dir}/q3_missing_rates_original.json", orient="records")

# Question 4: Conviction rates by crime category
q4 = df.dropna(subset=["offence_category", "offence_subcategory", "verdicts_category"])
q4["is_guilty"] = q4["verdicts_category"].str.lower() == "guilty"

# Conviction rate by offence category
q4_cat = (
    q4.groupby("offence_category")
      .agg(total=("verdicts_category", "count"), guilty=("is_guilty", "sum"))
      .assign(conviction_rate=lambda x: (x["guilty"] / x["total"]).round(3))
      .reset_index())
q4_cat.to_json(f"{output_dir}/q4_conviction_by_offence_category.json", orient="records")

# Conviction rate by offence subcategory
q4_subcat = (
    q4.groupby(["offence_category", "offence_subcategory"])
      .agg(total=("verdicts_category", "count"), guilty=("is_guilty", "sum"))
      .join(q4_cat.set_index("offence_category")["guilty"], on="offence_category", rsuffix="_category")
      .assign(conviction_rate=lambda x: (x["guilty"] / x["total"]).round(3))
      .reset_index())
q4_subcat.to_json(f"{output_dir}/q4_conviction_by_offence_subcategory.json", orient="records")

# Question 5: Property crimes (e.g., theft, burglary) - during economic hardship (external data integration needed later)
q5 = df[["session_date", "offence_category"]].dropna()
q5["year"] = pd.to_datetime(q5["session_date"], errors="coerce").dt.year

property_crime_categories = ['theft', 'deception', 'damage', 'violentTheft']
q5 = q5.dropna(subset=['year'])
all_counts_by_year = q5.groupby('year').size().to_dict()

# Property crime statistics by category
property_q5 = q5[q5['offence_category'].isin(property_crime_categories)]
yearly = property_q5.groupby(['year', 'offence_category']).size().unstack(fill_value=0)

yearly['total_property'] = yearly.sum(axis=1)
yearly['total_all'] = yearly.index.map(all_counts_by_year.get)
yearly_dict = yearly.fillna(0).astype(int).to_dict(orient='index')

# Definition of economic hardship
crisis_periods = [
    {"start": 1793, "end": 1815, "label": "Grain Crisis & War"},
    {"start": 1825, "end": 1835, "label": "1825 Financial Crash"},
    {"start": 1845, "end": 1865, "label": "Famine & Slum Growth"},
    {"start": 1873, "end": 1896, "label": "Long Depression"},
    {"start": 1908, "end": 1911, "label": "1908 Recession"}
]

def compute_period_proportions(df, start, end):
    period = df[(df['year'] >= start) & (df['year'] <= end)]
    counts = period['offence_category'].value_counts()
    total = counts.sum()
    return (counts / total).to_dict() if total > 0 else {}

category_proportions = {"crisis": {}, "non_crisis": {}}

all_years = sorted(q5['year'].dropna().unique().astype(int))
crisis_years = set()
for p in crisis_periods:
    crisis_years.update(range(p['start'], p['end'] + 1))

non_crisis_ranges = []
temp = []
for y in all_years:
    if y not in crisis_years:
        temp.append(y)
    elif temp:
        non_crisis_ranges.append((temp[0], temp[-1]))
        temp = []
if temp:
    non_crisis_ranges.append((temp[0], temp[-1]))

# Added data on the ratio of crisis to non-crisis periods
for p in crisis_periods:
    key = f"{p['start']}-{p['end']}"
    category_proportions["crisis"][key] = compute_period_proportions(property_q5, p['start'], p['end'])

for start, end in non_crisis_ranges:
    key = f"{start}-{end}"
    category_proportions["non_crisis"][key] = compute_period_proportions(property_q5, start, end)

output = {
    "yearly_rates": yearly_dict,
    "economic_periods": crisis_periods,
    "category_proportions": category_proportions
}

with open("D:/kcl/individual_project_code/code/static/data/q5_property_crime_trends.json", "w") as f:
    json.dump(output, f, indent=2)

# Question 6: Crimes by individuals under 18
age_cleaned_path = "D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_predicted_age.csv"
df_age = pd.read_csv(age_cleaned_path)

# Raw data (non-forecasted)
df_ori = df_age[df_age["age_estimated"] == False].copy()
df_ori["age_source"] = "original"
df_ori["age_used"] = pd.to_numeric(df_ori["defendants_age_cleaned"], errors="coerce")

# Forecast data
df_pre = df_age.copy()
df_pre["age_source"] = "predicted"
df_pre["age_used"] = pd.to_numeric(df_pre["predicted_age"], errors="coerce")

def process_group(df, level, label):
    df_u18 = df[df["age_used"] < 18].copy()
    total = len(df_u18)
    group = (
        df_u18.groupby(level)
              .size()
              .reset_index(name="count")
              .assign(proportion=lambda d: (d["count"] / total).round(4))
              .sort_values(by="proportion", ascending=False)
    )
    group.to_json(os.path.join(output_dir, f"q6_{label}_under18_{df['age_source'].iloc[0]}.json"), orient="records")

process_group(df_ori, "offence_category", "offence_category")
process_group(df_ori, "offence_subcategory", "offence_subcategory")
process_group(df_pre, "offence_category", "offence_category")
process_group(df_pre, "offence_subcategory", "offence_subcategory")

# Question 7: Crime counts over time (for industrialization impact; needs external event overlay)
df = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_crime_and_age_group.csv")
q7 = df.dropna(subset=["session_date", "crime_type", "age_group"])
q7["year"] = q7["session_date"].astype(str).str[:4].astype(int)

# Definition of the industrialization period
industrial_stages = [
    {"name": "Pre-Industrialisation", "start": 1674, "end": 1779},
    {"name": "Early Industrialisation", "start": 1780, "end": 1839},
    {"name": "Mature Industrialisation", "start": 1840, "end": 1869},
    {"name": "Post-Industrialisation", "start": 1870, "end": 1913},
]

total_trend = q7.groupby("year").size().reset_index(name="count")
category_trend = q7.groupby(["year", "offence_category"]).size().unstack(fill_value=0).reset_index()
structure_trend = q7.groupby(["year", "crime_type"]).size().unstack(fill_value=0).reset_index()
age_structure = q7.groupby(["year", "age_group"]).size().unstack(fill_value=0).reset_index()

output_data = {
    "industrial_stages": industrial_stages,
    "total_trend": total_trend.to_dict(orient="records"),
    "category_trend": category_trend.to_dict(orient="records"),
    "structure_by_year": structure_trend.to_dict(orient="records"),
    "age_structure": age_structure.to_dict(orient="records")
}

with open("D:/kcl/individual_project_code/code/static/data/q7_industrial_crime_trends.json", "w", encoding="utf-8") as f:
    json.dump(output_data, f, indent=2)

# Question 8: Crimes of necessity (e.g., theft, food stealing)
def convert_keys(obj):
    if isinstance(obj, dict):
        return {
            str(k) if isinstance(k, (np.integer, int)) else k: convert_keys(v)
            for k, v in obj.items()
        }
    elif isinstance(obj, list):
        return [convert_keys(i) for i in obj]
    else:
        return obj

q8 = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_necessity_crimes.csv")
q8 = q8.dropna(subset=["session_date", "offence_category", "offence_subcategory", "is_necessity_crime"])
q8["year"] = q8["session_date"].astype(str).str[:4]
q8["year"] = pd.to_numeric(q8["year"], errors="coerce")

# Definition of a period of famine or high unemployment
crisis_periods = [
    {"start": 1793, "end": 1815, "label": "Grain Crisis & Napoleonic War"},
    {"start": 1825, "end": 1835, "label": "Financial Crisis"},
    {"start": 1845, "end": 1852, "label": "Irish Famine"},
    {"start": 1873, "end": 1896, "label": "Long Depression"},
    {"start": 1908, "end": 1911, "label": "Industrial Recession"}
]

result = {
    "crisis_periods": crisis_periods,
    "total": {},
    "categories": {}
}

years = sorted(q8["year"].unique())

for year in years:
    year_q8 = q8[q8["year"] == year]
    total_cases = len(year_q8)
    necessity_cases = year_q8[year_q8["is_necessity_crime"] == "yes"]
    necessity_total = len(necessity_cases)

    if total_cases == 0:
        continue

    # Overall necessary crime ratio and composition
    result["total"][year] = {
        "proportion": necessity_total / total_cases,
        "composition": necessity_cases["offence_category"].value_counts(normalize=True).to_dict()
    }

    # Necessary criminal circumstances for each offence category
    for category, group in necessity_cases.groupby("offence_category"):
        cat_total = len(year_q8[year_q8["offence_category"] == category])
        if cat_total == 0:
            continue
        prop = len(group) / total_cases
        if category not in result["categories"]:
            result["categories"][category] = {}
        result["categories"][category][year] = {
            "proportion": prop,
            "composition": group["offence_subcategory"].value_counts(normalize=True).to_dict()
        }

with open("D:/kcl/individual_project_code/code/static/data/q8_necessity_crime_trends.json", "w", encoding="utf-8") as f:
    json.dump(convert_keys(result), f, indent=2)

# Question 9: Technology-related crimes (e.g., railway)
q9 = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_tech_labels.csv")
q9["year"] = q9["session_date"].astype(str).str[:4].astype(int)
q9["tech_list"] = q9["technology_related_crime"].str.split(',')
q9 = q9[q9["tech_list"].notna()]
q9 = q9[q9["tech_list"].apply(lambda x: 'none' not in x)]
q9 = q9.explode("tech_list")
q9.rename(columns={"tech_list": "technology_related_crimes"}, inplace=True)

# Statistics by technology type
grouped = q9.groupby(["year", "technology_related_crimes", "offence_subcategory"]).size().reset_index(name="count")
total = grouped.groupby(["year", "technology_related_crimes"])["count"].sum().reset_index(name="total")
merged = pd.merge(grouped, total, on=["year", "technology_related_crimes"])
merged["proportion"] = merged["count"] / merged["total"]
trend_data = merged.to_dict(orient="records")

tech_periods = {
    "railway": {
        "label": "Railway Expansion (1840s-1870s)",
        "highlight_start": 1840,
        "highlight_end": 1879,
        "milestones": [
            {"year": 1825, "label": "First Public Railway (Stockton-Darlington)"}, 
            {"year":1830, "label": "Liverpool-Manchester Railway Opens"}]
    },
    "printing_media": {
        "label": "Modern Printing Boom (1800s)",
        "highlight_start": 1800,
        "highlight_end": 1900,
        "milestones": [
            {"year": 1695, "label": "Censorship Abolished (Licensing Act)"}, 
            {"year": 1702, "label": "First Daily Newspaper"}]
    },
    "banking": {
        "label": "Paper Instruments Era (19th Century)",
        "highlight_start": 1800,
        "highlight_end": 1900,
        "milestones": [
            {"year": 1694, "label": "Bank of England Founded"}, 
            {"year": 1750, "label": "Cheques & Notes Become Common"}]
    },
    "postal": {
        "label": "Royal Mail Network (1850s-1880s)",
        "highlight_start": 1850,
        "highlight_end": 1880,
        "milestones": [
            {"year": 1840, "label": "First Postage Stamp (Penny Black)"}, 
            {"year": 1850, "label": "National Mail System Established"}]
    },
    "gas_lighting": {
        "label": "Gas Street Lighting Spread",
        "highlight_start": 1820,
        "highlight_end": 1859,
        "milestones": [
            {"year": 1807, "label": "First Gas Streetlight (Pall Mall)"}, 
            {"year": 1820, "label": "Urban Adoption of Gas Lighting"}]
    }
}

output = {
    "data": trend_data,
    "tech_periods": tech_periods
}

with open("D:/kcl/individual_project_code/code/static/data/q9_tech_crimes_and_time.json", "w") as f:
    json.dump(output, f, indent=2)


# Question 10: Alcohol-related crimes and policy impact (e.g., Gin Act)
def convert_keys(obj):
    if isinstance(obj, dict):
        return {
            str(k) if isinstance(k, (np.integer, int)) else k: convert_keys(v)
            for k, v in obj.items()
        }
    elif isinstance(obj, list):
        return [convert_keys(i) for i in obj]
    else:
        return obj

q10 = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_alcohol_related_crimes.csv")
q10 = q10.dropna(subset=["session_date", "offence_category", "offence_subcategory", "is_alcohol_related_crime"])
q10["year"] = q10["session_date"].astype(str).str[:4]
q10["year"] = pd.to_numeric(q10["year"], errors="coerce")

# Definition of the relevant period in relation to the Liquor Act
policy_periods = [
  {
    "label": "Gin Acts (18th Century)",
    "start": 1720,
    "end": 1800,
    "markers": [
      {"year": 1729, "label": "First Gin Act"},
      {"year": 1736, "label": "Gin Act 1736"},
      {"year": 1743, "label": "Repeal of 1736 Act"},
      {"year": 1751, "label": "Gin Act 1751"}
    ]
  },
  {
    "label": "Beerhouse Acts (19th Century)",
    "start": 1801,
    "end": 1889,
    "markers": [
        {"year": 1828, "label": "Alehouse Act 1828"},
        {"year": 1830, "label": "Beerhouse Act 1830"},
        {"year": 1872, "label": "Licensing Act 1872"}
    ]
  },
  {
    "label": "Licensing Reforms (20th Century)",
    "start": 1890,
    "end": 1913,
    "markers": [
        {"year": 1898, "label": "Inebriates Act 1898"},
        {"year": 1904, "label": "Licensing Act 1904"}
    ]
  }
]

result = {
    "policy_periods": policy_periods,
    "total": {},
    "categories": {}
}

years_q10 = sorted(q10["year"].unique())

for year in years_q10:
    year_df = q10[q10["year"] == year]
    total_cases_q10 = len(year_df)
    alcohol_cases = year_df[year_df["is_alcohol_related_crime"] == "yes"]
    alcohol_total = len(alcohol_cases)

    if total_cases_q10 == 0:
        continue

    # Total proportion and composition
    result["total"][str(year)] = {
        "proportion": alcohol_total / total_cases_q10,
        "composition": alcohol_cases["offence_category"].value_counts(normalize=True).to_dict()
    }

    # The proportion of each offence category and subcategory composition
    for category, group in alcohol_cases.groupby("offence_category"):
        cat_total_q10 = len(year_df[year_df["offence_category"] == category])
        if cat_total_q10 == 0:
            continue
        prop = len(group) / total_cases_q10
        if category not in result["categories"]:
            result["categories"][category] = {}
        result["categories"][category][str(year)] = {
            "proportion": prop,
            "composition": group["offence_subcategory"].value_counts(normalize=True).to_dict()
        }

with open("D:/kcl/individual_project_code/code/static/data/q10_alcohol_crime_trends.json", "w", encoding="utf-8") as f:
    json.dump(convert_keys(result), f, indent=2)