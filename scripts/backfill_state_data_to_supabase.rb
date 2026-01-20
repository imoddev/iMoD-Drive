# encoding: UTF-8

require "csv"
require "digest"
require "json"
require "net/http"
require "uri"

supabase_url = ENV["SUPABASE_URL"]
api_key = ENV["SUPABASE_SERVICE_ROLE_KEY"]

if supabase_url.to_s.strip.empty? || api_key.to_s.strip.empty?
  warn "Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
  warn "Example:"
  warn "  SUPABASE_URL=\"https://<project_ref>.supabase.co\" SUPABASE_SERVICE_ROLE_KEY=\"<service-role>\" ruby scripts/backfill_state_data_to_supabase.rb \"State Data/sttt_car_new_reg_mm_2568_05.csv\" \"raw/2568/05/sttt_car_new_reg_mm_2568_05.csv\""
  exit 1
end

csv_path = ARGV[0]
object_path = ARGV[1]

if csv_path.to_s.strip.empty? || object_path.to_s.strip.empty?
  warn "Usage: ruby scripts/backfill_state_data_to_supabase.rb <csv_path> <object_path>"
  exit 1
end

unless File.exist?(csv_path)
  warn "CSV not found: #{csv_path}"
  exit 1
end

sha = Digest::SHA256.file(csv_path).hexdigest

rows = []
CSV.foreach(csv_path, headers: true, encoding: "bom|UTF-8") do |r|
  rows << {
    year_be: r["ปี พ.ศ."].to_i,
    month_th: r["เดือน"],
    vehicle_type: r["ประเภทรถ"],
    brand: r["ยี่ห้อ"],
    model: r["รุ่น"],
    count: r["จำนวน"].to_i,
  }
end

payload = {
  p_bucket: "state-data",
  p_object_path: object_path,
  p_file_sha256: sha,
  p_rows: rows,
}

uri = URI.join(supabase_url, "/rest/v1/rpc/rpc_ingest_state_data")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = (uri.scheme == "https")
req = Net::HTTP::Post.new(uri.request_uri)
req["apikey"] = api_key
req["authorization"] = "Bearer #{api_key}"
req["content-type"] = "application/json"
req.body = JSON.generate(payload)

res = http.request(req)

if res.code.to_i >= 200 && res.code.to_i < 300
  puts "OK"
  puts "sha256=#{sha}"
  puts "rows=#{rows.length}"
  puts "object_path=#{object_path}"
  puts "response=#{res.body}"
else
  warn "FAILED status=#{res.code}"
  warn res.body
  exit 2
end
