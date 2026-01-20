# encoding: UTF-8

require "digest"
require "json"
require "net/http"
require "uri"

supabase_url = ENV["SUPABASE_URL"]
service_role = ENV["SUPABASE_SERVICE_ROLE_KEY"]

if supabase_url.to_s.strip.empty? || service_role.to_s.strip.empty?
  warn "Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
  warn "Example:"
  warn "  SUPABASE_URL=\"https://<project_ref>.supabase.co\" SUPABASE_SERVICE_ROLE_KEY=\"<service-role>\" \\"
  warn "  ruby scripts/import_ckan_resource_to_supabase.rb 09bd50af-90ab-4d2e-b067-4589a621a241 raw/2568/06/ckan_09bd50af.json"
  exit 1
end

resource_id = ARGV[0]
object_path = ARGV[1]

if resource_id.to_s.strip.empty? || object_path.to_s.strip.empty?
  warn "Usage: ruby scripts/import_ckan_resource_to_supabase.rb <resource_id> <object_path>"
  exit 1
end

ckan_base = ENV["CKAN_BASE_URL"].to_s.strip
ckan_base = "https://datagov.mot.go.th" if ckan_base.empty?

def http_json_get(url)
  uri = URI(url)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = uri.scheme == "https"
  req = Net::HTTP::Get.new(uri.request_uri)
  req["accept"] = "application/json"
  res = http.request(req)
  raise "HTTP #{res.code} #{url}\n#{res.body}" unless res.code.to_i.between?(200, 299)
  JSON.parse(res.body)
end

def supabase_rpc_post(supabase_url, api_key, fn, payload)
  uri = URI.join(supabase_url, "/rest/v1/rpc/#{fn}")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = uri.scheme == "https"
  req = Net::HTTP::Post.new(uri.request_uri)
  req["apikey"] = api_key
  req["authorization"] = "Bearer #{api_key}"
  req["content-type"] = "application/json"
  req.body = JSON.generate(payload)
  res = http.request(req)
  raise "RPC FAILED HTTP #{res.code}\n#{res.body}" unless res.code.to_i.between?(200, 299)
  JSON.parse(res.body)
end

limit = 10_000
offset = 0
records = []

loop do
  url = "#{ckan_base}/api/3/action/datastore_search?resource_id=#{resource_id}&limit=#{limit}&offset=#{offset}"
  body = http_json_get(url)
  raise "CKAN success=false: #{body}" unless body["success"]

  result = body["result"] || {}
  batch = result["records"] || []
  records.concat(batch)

  total = result["total"].to_i
  offset += batch.length
  break if batch.empty? || offset >= total
end

if records.empty?
  warn "No records found for resource_id=#{resource_id}"
  exit 2
end

rows = records.map do |r|
  {
    year_be: r["ปี พ.ศ."].to_i,
    month_th: r["เดือน"],
    vehicle_type: r["ประเภทรถ"],
    brand: r["ยี่ห้อ"],
    model: r["รุ่น"],
    count: r["จำนวน"].to_i,
  }
end

sha = Digest::SHA256.hexdigest(JSON.generate({ ckan_base: ckan_base, resource_id: resource_id, rows: rows }))

payload = {
  p_bucket: "state-data",
  p_object_path: object_path,
  p_file_sha256: sha,
  p_rows: rows,
}

run_id = supabase_rpc_post(supabase_url, service_role, "rpc_ingest_state_data", payload)

puts "OK"
puts "resource_id=#{resource_id}"
puts "ckan_base=#{ckan_base}"
puts "records=#{records.length}"
puts "sha256=#{sha}"
puts "object_path=#{object_path}"
puts "run_id=#{run_id.inspect}"

