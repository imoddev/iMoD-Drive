# encoding: UTF-8

require "csv"
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
  warn "  ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2566 2567"
  exit 1
end

dataset_id = ARGV.shift
if dataset_id.to_s.strip.empty?
  warn "Usage: ruby scripts/import_ckan_dataset_years.rb <dataset_id> [year1 year2 ...]"
  exit 1
end

years = ARGV.map(&:to_i)
years = [2566, 2567] if years.empty?

ckan_base = ENV["CKAN_BASE_URL"].to_s.strip
ckan_base = "https://gdcatalog.dlt.go.th" if ckan_base.empty?

def http_get_json(url)
  uri = URI(url)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = uri.scheme == "https"
  req = Net::HTTP::Get.new(uri.request_uri)
  req["accept"] = "application/json"
  req["user-agent"] = "Mozilla/5.0 (compatible; DataImporter/1.0)"
  res = http.request(req)
  raise "HTTP #{res.code} #{url}\n#{res.body}" unless res.code.to_i.between?(200, 299)
  res.body
end

def http_get_bytes(url, limit = 5)
  raise "Too many redirects" if limit <= 0
  uri = URI(url)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = uri.scheme == "https"
  req = Net::HTTP::Get.new(uri.request_uri)
  req["accept"] = "*/*"
  req["user-agent"] = "Mozilla/5.0 (compatible; DataImporter/1.0)"
  res = http.request(req)
  case res
  when Net::HTTPSuccess
    res.body
  when Net::HTTPRedirection
    location = res["location"]
    raise "Redirect with no location" if location.to_s.strip.empty?
    http_get_bytes(location, limit - 1)
  else
    raise "HTTP #{res.code} #{url}\n#{res.body}"
  end
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

pkg_url = "#{ckan_base}/api/3/action/package_show?id=#{dataset_id}"
pkg = JSON.parse(http_get_json(pkg_url))
raise "CKAN success=false" unless pkg["success"]

resources = pkg.dig("result", "resources") || []

year_set = years.map(&:to_s)
selected = resources.select do |r|
  url = r["url"].to_s
  name = r["name"].to_s
  next false unless url.downcase.end_with?(".csv")
  year_set.any? { |y| url.include?(y) || name.include?(y) }
end

if selected.empty?
  warn "No CSV resources found for years #{years.join(', ')}"
  exit 2
end

selected.sort_by! { |r| r["url"].to_s }

selected.each do |r|
  url = r["url"].to_s
  filename = File.basename(url)
  # Expect ..._mm_2566_01.csv or ..._mm_2567_12.csv
  match = filename.match(/_(\d{4})_(\d{2})\.csv$/i)
  unless match
    warn "Skip (unexpected filename): #{filename}"
    next
  end

  year = match[1]
  month = match[2]
  object_path = "raw/#{year}/#{month}/#{filename}"

  puts "Download: #{filename}"
  csv_text = http_get_bytes(url)
  csv_text = csv_text.force_encoding("UTF-8")
  csv_text = csv_text.encode("UTF-8", invalid: :replace, undef: :replace, replace: "")
  csv_text.sub!(/\A\uFEFF/, "")

  rows = []
  CSV.parse(csv_text, headers: true, header_converters: ->(h) { h&.strip }) do |rrow|
    rows << {
      year_be: rrow["ปี พ.ศ."].to_i,
      month_th: rrow["เดือน"]&.strip,
      vehicle_type: rrow["ประเภทรถ"]&.strip,
      brand: rrow["ยี่ห้อ"]&.strip,
      model: rrow["รุ่น"]&.strip,
      count: rrow["จำนวน"].to_i,
    }
  end

  if rows.empty? || rows.first[:year_be].to_i == 0 || rows.first[:month_th].to_s.strip.empty?
    warn "Skip (no valid rows): #{filename}"
    next
  end

  sha = Digest::SHA256.hexdigest(csv_text)
  payload = {
    p_bucket: "state-data",
    p_object_path: object_path,
    p_file_sha256: sha,
    p_rows: rows,
  }

  run_id = supabase_rpc_post(supabase_url, service_role, "rpc_ingest_state_data", payload)
  puts "Ingest OK: year=#{year} month=#{month} rows=#{rows.length} run_id=#{run_id.inspect}"
end
