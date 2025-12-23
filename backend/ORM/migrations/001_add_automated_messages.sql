ALTER TABLE main.property 
ADD COLUMN IF NOT EXISTS automatedwelcomemessage TEXT,
ADD COLUMN IF NOT EXISTS automatedcheckinmessage TEXT,
ADD COLUMN IF NOT EXISTS automatedWelcomeMessage TEXT,
ADD COLUMN IF NOT EXISTS automatedCheckinMessage TEXT;

