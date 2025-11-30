-- Create generations table to store all document generations
CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Input fields
    job_description TEXT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    hr_name VARCHAR(255),
    custom_prompt TEXT,

    -- Generated content
    cover_letter TEXT NOT NULL,
    cold_email TEXT NOT NULL,

    -- Analysis results (stored as JSONB for flexibility)
    job_requirements JSONB,
    company_research JSONB,
    user_qualifications JSONB,
    writing_style JSONB,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Index for faster queries
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_generations_updated_at BEFORE UPDATE ON generations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
