// src/components/avatarstudio/JobStatusDisplay.js
import React from 'react';

const JobStatusDisplay = ({ jobId, status, statusDetail, progress, error }) => {
  if (!jobId && !status) return null;

  return (
    <div style={{ marginTop: '20px', padding: '10px', border: `1px solid ${error ? 'red' : '#ccc'}` }}>
      <h4>Generation Status</h4>
      {jobId && <p>Job ID: {jobId}</p>}
      {status && <p>Status: <strong>{status}</strong></p>}
      {statusDetail && <p>Details: {statusDetail}</p>}
      {progress > 0 && progress < 100 && (
        <progress value={progress} max="100" style={{ width: '100%' }}></progress>
      )}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
};
export default JobStatusDisplay;
