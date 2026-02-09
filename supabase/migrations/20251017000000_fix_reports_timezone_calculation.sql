/*
  # Fix Timezone Calculation for Scheduled Reports

  1. Changes
    - Create function to calculate next_run_at properly converting EST/EDT to UTC
    - Create trigger to automatically calculate next_run_at on INSERT/UPDATE
    - Fix existing reports with incorrect next_run_at times

  2. Purpose
    - Ensure reports scheduled for "7:00 AM EST" actually run at 7 AM Eastern time
    - Convert Eastern time to UTC properly (7 AM EST = 12 PM UTC, 7 AM EDT = 11 AM UTC)
    - Automatically recalculate next_run_at when schedule changes

  3. Notes
    - EDT (Eastern Daylight Time): UTC-4 (March-November)
    - EST (Eastern Standard Time): UTC-5 (November-March)
    - To convert FROM Eastern TO UTC, we ADD the offset hours
*/

-- Function to determine if a date is in Eastern Daylight Time
CREATE OR REPLACE FUNCTION is_eastern_daylight_time(check_date timestamptz)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  year_val integer;
  march_second_sunday timestamptz;
  november_first_sunday timestamptz;
BEGIN
  year_val := EXTRACT(YEAR FROM check_date);

  -- DST starts on the second Sunday of March at 2 AM
  march_second_sunday := (DATE_TRUNC('month', make_date(year_val, 3, 1)) + interval '1 month' - interval '1 day')::date;
  march_second_sunday := march_second_sunday + make_interval(days => (14 - EXTRACT(DOW FROM march_second_sunday)::integer) % 7);
  march_second_sunday := march_second_sunday + interval '2 hours';

  -- DST ends on the first Sunday of November at 2 AM
  november_first_sunday := (DATE_TRUNC('month', make_date(year_val, 11, 1)))::date;
  november_first_sunday := november_first_sunday + make_interval(days => (7 - EXTRACT(DOW FROM november_first_sunday)::integer) % 7);
  november_first_sunday := november_first_sunday + interval '2 hours';

  RETURN check_date >= march_second_sunday AND check_date < november_first_sunday;
END;
$$;

-- Function to calculate next run time for a report
CREATE OR REPLACE FUNCTION calculate_next_run_at(
  schedule_time_param text,
  schedule_frequency_param text,
  schedule_day_param integer DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
  hours_val integer;
  minutes_val integer;
  now_eastern timestamptz;
  target_year integer;
  target_month integer;
  target_day integer;
  current_hour integer;
  current_minute integer;
  scheduled_minutes integer;
  current_minutes integer;
  time_passed_today boolean;
  target_day_of_week integer;
  current_day_of_week integer;
  days_until_target integer;
  target_day_of_month integer;
  days_in_month_val integer;
  test_date timestamptz;
  is_edt boolean;
  offset_hours integer;
  result_utc timestamptz;
BEGIN
  -- Parse the schedule time
  hours_val := SPLIT_PART(schedule_time_param, ':', 1)::integer;
  minutes_val := SPLIT_PART(schedule_time_param, ':', 2)::integer;

  -- Get current time in Eastern timezone
  now_eastern := timezone('America/New_York', NOW());
  target_year := EXTRACT(YEAR FROM now_eastern)::integer;
  target_month := EXTRACT(MONTH FROM now_eastern)::integer;
  target_day := EXTRACT(DAY FROM now_eastern)::integer;
  current_hour := EXTRACT(HOUR FROM now_eastern)::integer;
  current_minute := EXTRACT(MINUTE FROM now_eastern)::integer;

  -- Check if scheduled time has passed today
  scheduled_minutes := hours_val * 60 + minutes_val;
  current_minutes := current_hour * 60 + current_minute;
  time_passed_today := scheduled_minutes <= current_minutes;

  -- Calculate target date based on frequency
  IF schedule_frequency_param = 'daily' THEN
    IF time_passed_today THEN
      -- Move to tomorrow
      now_eastern := now_eastern + interval '1 day';
      target_year := EXTRACT(YEAR FROM now_eastern)::integer;
      target_month := EXTRACT(MONTH FROM now_eastern)::integer;
      target_day := EXTRACT(DAY FROM now_eastern)::integer;
    END IF;

  ELSIF schedule_frequency_param = 'weekly' THEN
    target_day_of_week := COALESCE(schedule_day_param, 1);
    current_day_of_week := EXTRACT(DOW FROM now_eastern)::integer;

    days_until_target := target_day_of_week - current_day_of_week;

    IF days_until_target = 0 AND time_passed_today THEN
      days_until_target := 7;
    ELSIF days_until_target < 0 THEN
      days_until_target := days_until_target + 7;
    END IF;

    now_eastern := now_eastern + (days_until_target || ' days')::interval;
    target_year := EXTRACT(YEAR FROM now_eastern)::integer;
    target_month := EXTRACT(MONTH FROM now_eastern)::integer;
    target_day := EXTRACT(DAY FROM now_eastern)::integer;

  ELSIF schedule_frequency_param = 'monthly' THEN
    target_day_of_month := COALESCE(schedule_day_param, 1);

    IF target_day > target_day_of_month OR (target_day = target_day_of_month AND time_passed_today) THEN
      target_month := target_month + 1;
      IF target_month > 12 THEN
        target_month := 1;
        target_year := target_year + 1;
      END IF;
    END IF;

    target_day := target_day_of_month;

    -- Adjust for months with fewer days
    days_in_month_val := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(target_year, target_month, 1)) + interval '1 month' - interval '1 day'))::integer;
    IF target_day > days_in_month_val THEN
      target_day := days_in_month_val;
    END IF;
  END IF;

  -- Create test date to determine EDT vs EST
  test_date := make_timestamptz(target_year, target_month, target_day, 12, 0, 0, 'UTC');
  is_edt := is_eastern_daylight_time(test_date);
  offset_hours := CASE WHEN is_edt THEN 4 ELSE 5 END;

  -- Convert Eastern time to UTC by ADDING the offset
  -- 7 AM EST = 12 PM UTC (7 + 5)
  -- 7 AM EDT = 11 AM UTC (7 + 4)
  result_utc := make_timestamptz(
    target_year,
    target_month,
    target_day,
    hours_val + offset_hours,
    minutes_val,
    0,
    'UTC'
  );

  RETURN result_utc;
END;
$$;

-- Create trigger function to automatically calculate next_run_at
CREATE OR REPLACE FUNCTION set_next_run_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only calculate next_run_at for scheduled reports
  IF NEW.schedule_type = 'scheduled' AND NEW.is_active = true THEN
    NEW.next_run_at := calculate_next_run_at(
      NEW.schedule_time,
      NEW.schedule_frequency,
      NEW.schedule_day
    );
  ELSE
    NEW.next_run_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_next_run_at ON astra_reports;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trigger_set_next_run_at
  BEFORE INSERT OR UPDATE OF schedule_time, schedule_frequency, schedule_day, schedule_type, is_active
  ON astra_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_next_run_at();

-- Fix existing reports with incorrect next_run_at times
UPDATE astra_reports
SET next_run_at = calculate_next_run_at(schedule_time, schedule_frequency, schedule_day)
WHERE schedule_type = 'scheduled'
  AND is_active = true
  AND next_run_at IS NOT NULL;

-- Add helpful comment
COMMENT ON FUNCTION calculate_next_run_at IS 'Calculates the next run time for a scheduled report, properly converting Eastern time to UTC';
COMMENT ON FUNCTION is_eastern_daylight_time IS 'Determines if a given date falls within Eastern Daylight Time (EDT) or Eastern Standard Time (EST)';
