-- Add unique constraint to prevent duplicate adaptive parameters
ALTER TABLE ml_adaptive_parameters 
ADD CONSTRAINT unique_model_parameter 
UNIQUE (model_name, parameter_name);

-- Add missing parameter_type column with default value
ALTER TABLE ml_adaptive_parameters 
ALTER COLUMN parameter_type SET DEFAULT 'adjustment';

-- Update existing rows to have a parameter_type
UPDATE ml_adaptive_parameters 
SET parameter_type = 'adjustment' 
WHERE parameter_type IS NULL OR parameter_type = '';
