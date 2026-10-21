// Supabase connection (from the workbook's Settings sheet). The publishable key is safe in the browser;
// never put the service_role / secret key here. Row-level security on the database protects the data.
window.RTV = {
  url: "https://qxkttyxzdhbafqmltdlt.supabase.co",
  key: "sb_publishable_LYV1aUzOfhmztLo2AcGieg_5tBTbZ7r",
  types: ["TRANSFER", "ISSUE", "RETURN", "REPAIR", "LOST", "FOUND"], // = movements_movement_type_check
  acts: ["BHS", "AHS", "SEs", "HH Mapping"],                          // = Transfer Form activity list
  status: ["In Use", "Returned", "Stored", "In Repair", "Lost"]       // = assets_status_check
};
