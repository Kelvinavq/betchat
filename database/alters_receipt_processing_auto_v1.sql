UPDATE bot_items
SET receipt_processing = 'auto'
WHERE screen_id = 'screen-cargar'
  AND type = 'button'
  AND (show_receipt_after = 1 OR button_type = 'receipt_request');
