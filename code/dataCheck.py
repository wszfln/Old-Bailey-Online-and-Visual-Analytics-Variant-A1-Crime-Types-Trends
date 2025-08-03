import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data.csv")

# Define columns to analyze for "Unknown" values
unknown_columns = [
    "defendants_age", "defendants_gender", "defendants_occupation",
    "offence_id", "offence_category", "offence_subcategory",
    "verdicts_category", "verdicts_subcategory", "sentences_category", "sentences_subcategory"
]

# Compute the proportion of "Unknown" values
unknown_ratios = df[unknown_columns].apply(lambda col: (col == "Unknown").mean())
unknown_ratios = (unknown_ratios * 100).round(2)

print("Proportion of 'Unknown' values in each attribute (%):\n")
print(unknown_ratios)

plt.figure(figsize=(10, 6))
sns.barplot(x=unknown_ratios.index, y=unknown_ratios.values, palette="viridis")
plt.xticks(rotation=45, ha="right")
plt.ylabel("Percentage of 'Unknown' Values")
plt.title("Proportion of 'Unknown' Values in Each Attribute")
plt.show()