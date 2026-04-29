import os
import tempfile
import structlog

logger = structlog.get_logger()

def setup_gcp_auth():
    """
    Setup Google Cloud authentication.
    If GCP_SERVICE_ACCOUNT_JSON is set in environment, save to a temp file
    and set GOOGLE_APPLICATION_CREDENTIALS to that file.
    """
    json_str = os.environ.get("GCP_SERVICE_ACCOUNT_JSON")
    if not json_str:
        return

    try:
        # Don't log the actual JSON!
        logger.info("auth.gcp.using_env_json")
        
        # Use a persistent temp file for the duration of the process
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            f.write(json_str)
            temp_path = f.name
            
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_path
        logger.info("auth.gcp.credentials_set", path=temp_path)
    except Exception as e:
        logger.error("auth.gcp.failed", error=str(e))
