from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
loaded = load_dotenv(dotenv_path=dotenv_path)
print(f"[DEBUG] .env file found and loaded: {loaded}") # Should print True

# Define the static folder relative to the app.py location
static_folder = os.path.join(os.path.dirname(__file__), 'static')
# Pass static_folder explicitly if it's not named 'static' or not in the default location
app = Flask(__name__, static_folder=static_folder, static_url_path='')
CORS(app)  # Enable CORS for all routes

# Configure Gemini API
API_KEY = os.getenv("GEMINI_KEY")           # export GEMINI_KEY="...." before running
print(f"[DEBUG] Value of API_KEY from os.getenv: {API_KEY}") # Print the retrieved value
if not API_KEY:
    raise RuntimeError("Set the environment variable GEMINI_KEY with your Google AI Studio key.")
print("[DEBUG] Loaded API KEY:", 'SET' if API_KEY else 'NOT SET')

genai.configure(api_key=API_KEY)

generation_config = {
    "temperature": 1.5,
    "top_p": 0.8,
    "top_k": 40,
    "max_output_tokens": 8192,
}

# Use the most widely available model name
MODEL_NAME = "gemini-1.5-pro-latest"

model = genai.GenerativeModel(
    model_name=MODEL_NAME,
    generation_config=generation_config,
)

# ---------- helper function ----------
def get_chat_response(prompt: str) -> Optional[str]:
    """
    Send *prompt* to Gemini and return an empathetic mental‑health reply.
    """
    enhanced_prompt = f"""
        You are Sanjeevni, an AI-powered therapy companion designed to provide empathetic, conversational mental health support. 
        Your role is to act like a trusted friend: first understanding the user's feelings deeply through caring questions, then offering gentle support, insights, or helpful suggestions.

        Strict Interaction Guidelines:
        - Always respond with warmth, compassion, and emotional intelligence.
        - First focus on understanding the user's situation: ask thoughtful, gentle follow-up questions to dive deeper into what they are feeling or experiencing.
        - Only after understanding enough context, offer caring, relevant suggestions, ideas, or simple exercises that could help them feel a little better.
        - Never rush to give advice immediately; prioritize active listening and emotional connection first.
        - Avoid robotic patterns, unnecessary repetition, or filler words ("I understand," "I'm sorry to hear that") unless used meaningfully.
        - Speak naturally, like a wise and supportive friend would.
        - Offer evidence-based emotional support techniques where appropriate (like journaling prompts, breathing exercises, grounding techniques), but always in a soft, optional tone.
        - Never provide formal medical diagnoses, treatment plans, or suggest medications.
        - If the user expresses suicidal thoughts, self-harm, or extreme distress, compassionately encourage them to seek urgent help. Gently share these resources:
        - Emergency Services (India): Call 112
        - Mental Health Helpline (India - iCall): +91-9152987821
        - If the user is outside India, gently encourage them to reach out to a local crisis service or a trusted person.
        - Be flexible and human-like: match your language to the user's energy (if they are casual, be casual; if they are formal, be respectful).
        - Always prioritize helping the user feel heard, understood, and supported — not solving everything or acting superior.

        Tone and Style:
        - Friendly, emotionally intelligent, natural, and non-intrusive.
        - Use conversational, human-style language — avoid sounding scripted or robotic.
        - Mirror their emotions gently without parroting their exact words.
        - Encourage hope, small steps forward, and self-compassion without being preachy.

        Response Flow:
        1. Empathize genuinely with the user's feelings.
        2. Ask **one or two thoughtful, non-intrusive questions** to explore deeper if appropriate.
        3. Once enough is understood, **offer caring support, suggestions, or encouragement**.
        4. Keep the conversation flowing naturally, like a genuine friend would.
        User message: {prompt}
        """

    try:
        response = model.generate_content(enhanced_prompt)
        return response.text
    except Exception as e:
        import traceback
        print("[Gemini API error]", e)
        traceback.print_exc()
        return "I'm having trouble connecting right now. Please try again in a moment, or if this persists, contact support."
    try:
        # For most recent SDKs, use generate_content for single-turn
        response = model.generate_content(enhanced_prompt)
        return response.text
    except Exception as e:
        import traceback
        print("[Gemini error]", e)
        traceback.print_exc()
        return "I’m sorry, I’m having trouble connecting right now. Please try again later."

# Route to serve the main index.html file
@app.route('/')
def serve_index():
    # Serve index.html from the static folder specified during Flask app initialization
    # Note: Flask automatically handles requests for files in the static_folder
    # if they match the static_url_path. Since static_url_path is '',
    # requests like /index.js will be served from the static_folder.
    # However, explicitly serving index.html for the root '/' is common practice.
    return send_from_directory(app.static_folder, 'index.html')

# Route to serve other static files (CSS, JS, images, etc.)
# Flask handles this automatically if static_folder is set correctly and
# static_url_path is configured. The route below is often redundant if
# static_folder='static' and static_url_path='/static' (the defaults)
# or if static_url_path='' as set above.
# However, explicitly defining it can sometimes help with clarity or complex setups.
# @app.route('/<path:filename>')
# def serve_static(filename):
#     return send_from_directory(app.static_folder, filename)

# Placeholder for conversation history (replace with actual storage if needed)
conversation_history = []

# Define the /chat route to handle POST requests
@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400

        user_message = data.get('message', '')
        conversation_history.append({'sender': 'user', 'text': user_message})

        if not user_message:
             # Return a default or empty response if message is empty,
             # avoids unnecessary API call
             return jsonify({'response': 'Please provide a message.', 'analysis': analyze_message('')})

        # Limit conversation history to the last 10 messages (user + assistant)
        limited_history = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history

        # Format conversation history for context
        formatted_history = ""
        for msg in limited_history:
            role = "User" if msg.get('sender') == 'user' else "Assistant"
            formatted_history += f"{role}: {msg.get('text', '')}\n"

        # Create prompt with context
        prompt = f"""
        Previous conversation:
        {formatted_history}
        User: {user_message}
        """

        # Generate response
        response = get_chat_response(prompt)

        # Analyze the message for mental health indicators
        analysis = analyze_message(user_message)

        # Append response to conversation history
        conversation_history.append({'sender': 'assistant', 'text': response})

        return jsonify({
            'response': response,
            'analysis': analysis
        })

    except Exception as e:
        # Log the exception for debugging
        app.logger.error(f"Error in /chat: {e}", exc_info=True)
        # Return a generic error to the client
        return jsonify({'error': 'An internal server error occurred'}), 500

def analyze_message(message):
    """
    Analyze the user's message for mental health indicators.
    This is a more sophisticated version that considers keyword presence, intensity modifiers,
    and contextual patterns to provide a more accurate mental health analysis.
    """
    message = message.lower() if isinstance(message, str) else '' # Ensure message is string

    # Initialize analysis metrics
    analysis = {
        'depression': 0,
        'anxiety': 0,
        'happiness': 0,
        'suicidal': 0,
        'stress': 0
    }

    # Define expanded keyword sets for better coverage
    depression_keywords = {
        'sad', 'depressed', 'unhappy', 'hopeless', 'worthless', 'empty', 'lonely', 'miserable',
        'grief', 'despair', 'gloomy', 'discouraged', 'disappointed', 'down', 'blue', 'numb',
        'unmotivated', 'tired of living', 'giving up', 'no energy', 'no interest', 'crying'
    }
    
    anxiety_keywords = {
        'worry', 'anxious', 'nervous', 'panic', 'fear', 'scared', 'terrified', 'dread',
        'uneasy', 'restless', 'tense', 'on edge', 'stressed out', 'overthinking', 'afraid',
        'apprehensive', 'concerned', 'freaking out', 'heart racing', 'can\'t breathe'
    }
    
    happiness_keywords = {
        'happy', 'joy', 'good', 'great', 'excited', 'positive', 'wonderful', 'fantastic',
        'delighted', 'pleased', 'content', 'satisfied', 'grateful', 'thankful', 'optimistic',
        'hopeful', 'cheerful', 'blessed', 'peaceful', 'calm', 'relaxed', 'relieved'
    }
    
    suicidal_keywords = {
        'die', 'death', 'end it', 'suicide', 'kill myself', 'no reason to live', 'better off dead',
        'want to die', 'not worth living', 'end my life', 'take my life', 'can\'t go on',
        'goodbye forever', 'final note', 'no way out', 'ending it all', 'last resort'
    }
    
    stress_keywords = {
        'stress', 'overwhelm', 'pressure', 'busy', 'tired', 'exhausted', 'burnout', 'overworked',
        'too much', 'can\'t handle', 'breaking point', 'burden', 'workload', 'deadline',
        'no time', 'no break', 'no rest', 'struggling', 'difficult', 'challenging'
    }

    # Define intensity modifiers that affect the score
    high_intensity_modifiers = {
        'very', 'extremely', 'severely', 'deeply', 'profoundly', 'unbearably',
        'constantly', 'always', 'completely', 'totally', 'absolutely', 'overwhelming'
    }
    
    moderate_intensity_modifiers = {
        'quite', 'rather', 'fairly', 'pretty', 'somewhat', 'moderately', 'often', 'frequently'
    }
    
    low_intensity_modifiers = {
        'slightly', 'a bit', 'a little', 'occasionally', 'sometimes', 'mild', 'minor'
    }
    
    negation_modifiers = {
        'not', 'don\'t', 'doesn\'t', 'didn\'t', 'no', 'never', 'none', 'aren\'t', 'isn\'t', 'wasn\'t'
    }

    # Split message into words and bigrams (pairs of consecutive words)
    words = message.split()
    bigrams = [' '.join(words[i:i+2]) for i in range(len(words)-1)]
    trigrams = [' '.join(words[i:i+3]) for i in range(len(words)-2)]
    
    # Check for negation context (e.g., "not sad" should not trigger depression)
    negated_indices = set()
    for i, word in enumerate(words):
        if word in negation_modifiers:
            # Mark the next few words as negated
            for j in range(i+1, min(i+4, len(words))):
                negated_indices.add(j)
    
    # Function to check if a word at index is negated
    def is_negated(index):
        return index in negated_indices
    
    # Analyze each category with intensity consideration
    for i, word in enumerate(words):
        # Skip negated words
        if is_negated(i):
            continue
            
        # Check for intensity modifiers before keywords
        intensity_multiplier = 1.0
        if i > 0:
            prev_word = words[i-1]
            if prev_word in high_intensity_modifiers:
                intensity_multiplier = 2.0
            elif prev_word in moderate_intensity_modifiers:
                intensity_multiplier = 1.5
            elif prev_word in low_intensity_modifiers:
                intensity_multiplier = 0.5
        
        # Check each category
        if word in depression_keywords:
            analysis['depression'] += 10 * intensity_multiplier
        if word in anxiety_keywords:
            analysis['anxiety'] += 10 * intensity_multiplier
        if word in happiness_keywords:
            analysis['happiness'] += 10 * intensity_multiplier
        if word in suicidal_keywords:
            analysis['suicidal'] += 20 * intensity_multiplier  # Higher weight for suicidal indicators
        if word in stress_keywords:
            analysis['stress'] += 10 * intensity_multiplier
    
    # Check bigrams and trigrams for more context
    for phrase in bigrams + trigrams:
        if any(keyword in phrase for keyword in suicidal_keywords):
            # Phrases containing suicidal keywords are particularly important
            analysis['suicidal'] += 15
    
    # Look for specific patterns that indicate higher severity
    if 'no hope' in message or 'lost hope' in message or 'giving up' in message:
        analysis['depression'] += 15
    
    if 'panic attack' in message or 'anxiety attack' in message:
        analysis['anxiety'] += 20
    
    if 'plan to' in message and any(keyword in message for keyword in suicidal_keywords):
        analysis['suicidal'] += 30  # Having a plan indicates higher risk
    
    # Ensure values stay within reasonable bounds (0-100)
    for key in analysis:
        # Apply a sigmoid-like function to ensure values taper off and don't exceed 100
        raw_value = analysis[key]
        if raw_value > 0:
            # Convert to a value between 0-100 with diminishing returns for higher values
            analysis[key] = min(100, int(100 * (1 - 1 / (1 + raw_value/50))))
    
    # Adjust happiness inversely if depression or anxiety is high
    if analysis['depression'] > 50 or analysis['anxiety'] > 50:
        analysis['happiness'] = max(0, analysis['happiness'] - 20)
    
    # If message is empty or very short, return minimal changes
    if len(message) < 5:
        return {key: min(5, value) for key, value in analysis.items()}
    
    return analysis

if __name__ == '__main__':
    # Use environment variable for port or default to 5000
    port = int(os.environ.get('PORT', 5000))
    # Set host to '0.0.0.0' to make it accessible on the network if needed
    # Use debug=False in production
    app.run(host='0.0.0.0', port=port, debug=True) 