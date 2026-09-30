-- Product variants: generic 1- or 2-level tree with an image per option.
-- Replaces colors jsonb + sizes string[].

ALTER TABLE "Product" ADD COLUMN "variants" JSONB;

UPDATE "Product"
SET "variants" = CASE
  WHEN "colors" IS NOT NULL
    AND jsonb_typeof("colors") = 'array'
    AND jsonb_array_length("colors") > 0
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements("colors") AS c
      WHERE jsonb_typeof(c->'sizes') = 'array'
        AND jsonb_array_length(c->'sizes') > 0
    )
  THEN jsonb_build_object(
    'axes', jsonb_build_array(
      jsonb_build_object('key', 'color', 'label', 'لون'),
      jsonb_build_object('key', 'size', 'label', 'قياس')
    ),
    'options', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', c->>'name',
          'hex', c->>'hex',
          'image', COALESCE(c->>'image', ''),
          'children', COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'name', s,
                  'image', COALESCE(c->>'image', '')
                )
              )
              FROM jsonb_array_elements_text(COALESCE(c->'sizes', '[]'::jsonb)) AS s
            ),
            '[]'::jsonb
          )
        )
      )
      FROM jsonb_array_elements("colors") AS c
    )
  )
  WHEN "colors" IS NOT NULL
    AND jsonb_typeof("colors") = 'array'
    AND jsonb_array_length("colors") > 0
  THEN jsonb_build_object(
    'axes', jsonb_build_array(
      jsonb_build_object('key', 'color', 'label', 'لون')
    ),
    'options', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', c->>'name',
          'hex', c->>'hex',
          'image', COALESCE(c->>'image', '')
        )
      )
      FROM jsonb_array_elements("colors") AS c
    )
  )
  WHEN cardinality("sizes") > 0
  THEN jsonb_build_object(
    'axes', jsonb_build_array(
      jsonb_build_object('key', 'size', 'label', 'قياس')
    ),
    'options', (
      SELECT jsonb_agg(jsonb_build_object('name', s, 'image', ''))
      FROM unnest("sizes") AS s
    )
  )
  ELSE NULL
END;

ALTER TABLE "Product" DROP COLUMN "colors";
ALTER TABLE "Product" DROP COLUMN "sizes";
