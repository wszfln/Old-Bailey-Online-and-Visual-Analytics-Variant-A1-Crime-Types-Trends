import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

df = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_age_cleaned.csv", low_memory=False)

df["year"] = df["session_date"].astype(str).str[:4]
df["year"] = pd.to_numeric(df["year"], errors="coerce")

df["predicted_age"] = df["defendants_age_cleaned"]
df["age_estimated"] = False
df["defendants_age_cleaned"] = pd.to_numeric(df["defendants_age_cleaned"], errors="coerce")

known_age = df[df["defendants_age_cleaned"].notna()].copy()
unknown_age = df[df["defendants_age_cleaned"].isna()].copy()

features = ["defendants_gender", "offence_category", "verdicts_category", "sentences_category", "year"]

encoded_df = df[features].astype(str).copy()
encoders = {}
for col in features:
    le = LabelEncoder()
    encoded_df[col] = le.fit_transform(encoded_df[col])
    encoders[col] = le

df_encoded = encoded_df.copy()
df_encoded["age"] = df["defendants_age_cleaned"]

X_train = df_encoded[df["defendants_age_cleaned"].notna()][features]
y_train = df_encoded[df["defendants_age_cleaned"].notna()]["age"]
X_pred = df_encoded[df["defendants_age_cleaned"].isna()][features]

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
predicted = model.predict(X_pred)

df.loc[df["defendants_age_cleaned"].isna(), "predicted_age"] = predicted.round(1)
df.loc[df["defendants_age_cleaned"].isna(), "age_estimated"] = True
df.to_csv("D:/kcl/individual_project_code/data/q6_predicted_age_result.csv", index=False)

# Merge the prediction results
original_df = pd.read_csv("D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_age_cleaned.csv")
pred_df = df[["trial_id", "predicted_age", "age_estimated"]]

# Merge by trial_id, overwrite defendants_age, and add age_estimated
merged_df = original_df.drop(columns=["defendants_age"], errors="ignore").merge(pred_df, on="trial_id", how="left")
merged_output_path = "D:/kcl/individual_project_code/data/new_cleaned_old_bailey_data_with_predicted_age.csv"
merged_df.to_csv(merged_output_path, index=False)