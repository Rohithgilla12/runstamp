-- User-editable run-type override (e.g. "Recovery run", "Speed workout").
-- NULL means "use the client-derived label from run.kind".
ALTER TABLE activities ADD COLUMN category_label text;
