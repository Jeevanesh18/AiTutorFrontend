const formatMessage = (text: string) => {
    // Bold **text**
    let html = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
    // Convert lines starting with - to bullet points
    html = html.replace(/^- (.+)$/gm, "• $1");
    // Line breaks
    html = html.replace(/\n/g, "<br />");
    return html;
  };