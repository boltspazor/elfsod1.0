-- Add start_date and end_date to surv_metrics (required by SurvMetrics model).
-- Run this if you see: column surv_metrics.start_date does not exist

ALTER TABLE surv_metrics ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE surv_metrics ADD COLUMN IF NOT EXISTS end_date DATE;
