# Korea Administrative Boundary Data

This directory stores static boundary data only. It is not yet mapped to election
candidate, pledge, or result data.

## Files

- `skorea_provinces_geo_simple.json`: KOSTAT 2013 simplified GeoJSON, 17
  province-level features. The landing page currently imports this file as a
  temporary stable rendered boundary.
- `skorea_provinces_topo_simple.json`: KOSTAT 2013 simplified TopoJSON, province-level topology.
- `skorea_municipalities_geo_simple.json`: KOSTAT 2013 simplified GeoJSON, 251 municipality-level features.
- `skorea_municipalities_topo_simple.json`: KOSTAT 2013 simplified TopoJSON, municipality-level topology.

## Source

- Repository: `southkorea/southkorea-maps`
- URL: `https://github.com/southkorea/southkorea-maps`
- Source dataset noted by that repository: KOSTAT administrative division geodata for Census, 2013.
- License note from that repository README: KOSTAT data is "Free to share or remix."
- Recommended official production source: VWorld 2D Data API / National Spatial
  Data Infrastructure administrative boundary datasets. This is preferred for
  official data joins, but requires an issued API key and a region-code
  normalization table.

## Integration Notes

- The rendered landing map imports
  `skorea_provinces_geo_simple.json`.
- KOSTAT feature properties include `code`, `name`, `name_eng`, and `base_year`.
- Do not use these files as a rendered election-result map until region-name/code mapping is explicitly validated.
- The `skorea_*` files are 2013 legacy references, so renamed or reorganized
  administrative areas need a normalization table before data joins.
