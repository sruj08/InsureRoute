import google.generativeai as genai

def test_func(x: str) -> str:
    """A test function.
    Args:
        x: A string.
    """
    return x

model = genai.GenerativeModel("gemini-2.0-flash", tools=[test_func])
print("Success!")
